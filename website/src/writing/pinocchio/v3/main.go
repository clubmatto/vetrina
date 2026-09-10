package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const (
	apiBaseURL = "https://api.deepseek.com"
	model      = "deepseek-v4-flash"
)

type Message struct {
	Role             string     `json:"role"`
	Content          string     `json:"content"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID       string     `json:"tool_call_id,omitempty"`
}

type ToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

var tools = []map[string]any{
	{
		"type": "function",
		"function": map[string]any{
			"name":        "read_file",
			"description": "Read a file from the current directory and return its full contents",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path": map[string]any{"type": "string"},
				},
				"required": []string{"path"},
			},
		},
	},
	{
		"type": "function",
		"function": map[string]any{
			"name":        "write_file",
			"description": "Create or replace a file in the current directory with the given contents",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path":    map[string]any{"type": "string"},
					"content": map[string]any{"type": "string"},
				},
				"required": []string{"path", "content"},
			},
		},
	},
	{
		"type": "function",
		"function": map[string]any{
			"name":        "list_dir",
			"description": "List the files and directories in the current directory",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path": map[string]any{"type": "string"},
				},
			},
		},
	},
}

type chatRequest struct {
	Model    string           `json:"model"`
	Messages []Message        `json:"messages"`
	Tools    []map[string]any `json:"tools,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

// chat sends the conversation so far, plus the available tools, to the
// DeepSeek chat completions API and returns the assistant's reply.
func chat(messages []Message, tools []map[string]any) (Message, error) {
	key := os.Getenv("DEEPSEEK_API_KEY")
	if key == "" {
		return Message{}, fmt.Errorf("DEEPSEEK_API_KEY is not set")
	}

	body, err := json.Marshal(chatRequest{Model: model, Messages: messages, Tools: tools})
	if err != nil {
		return Message{}, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, apiBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return Message{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Message{}, fmt.Errorf("post to %s: %w", apiBaseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(resp.Body)
		return Message{}, fmt.Errorf("api returned %s: %s", resp.Status, msg)
	}

	var decoded chatResponse
	if err = json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return Message{}, fmt.Errorf("decode response: %w", err)
	}
	if len(decoded.Choices) == 0 {
		return Message{}, fmt.Errorf("api returned no choices")
	}

	return decoded.Choices[0].Message, nil
}

// approve asks the human before runTool mutates anything on disk.
func approve(action string) bool {
	fmt.Printf("run %q? [y/N] ", action)
	var answer string
	fmt.Scanln(&answer)
	return strings.TrimSpace(answer) == "y"
}

// runTool executes a tool call and returns its output, or an error string
// the model can read when the call fails.
func runTool(call ToolCall) string {
	switch call.Function.Name {
	case "read_file":
		var args struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil {
			return "error: " + err.Error()
		}
		b, err := os.ReadFile(args.Path)
		if err != nil {
			return "error: " + err.Error()
		}
		return string(b)

	case "write_file":
		var args struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil {
			return "error: " + err.Error()
		}
		if !approve("write_file " + args.Path) {
			return "the human said no. Find another way."
		}
		if err := os.WriteFile(args.Path, []byte(args.Content), 0o644); err != nil {
			return "error: " + err.Error()
		}
		return "wrote " + args.Path

	case "list_dir":
		var args struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal([]byte(call.Function.Arguments), &args); err != nil {
			return "error: " + err.Error()
		}
		if args.Path == "" {
			args.Path = "."
		}
		entries, err := os.ReadDir(args.Path)
		if err != nil {
			return "error: " + err.Error()
		}
		var b strings.Builder
		for _, e := range entries {
			name := e.Name()
			if e.IsDir() {
				name += "/"
			}
			b.WriteString(name)
			b.WriteString("\n")
		}
		return b.String()

	default:
		return "unknown tool: " + call.Function.Name
	}
}

func main() {
	var messages []Message
	in := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !in.Scan() {
			return
		}
		text := strings.TrimSpace(in.Text())
		if text == "" {
			continue
		}
		messages = append(messages, Message{Role: "user", Content: text})

		for {
			assistant, err := chat(messages, tools)
			if err != nil {
				panic(err)
			}
			messages = append(messages, assistant)

			if len(assistant.ToolCalls) == 0 {
				fmt.Println(assistant.Content)
				break // the model stopped asking for tools: turn over
			}
			for _, call := range assistant.ToolCalls {
				fmt.Printf("\n>> %s\n", call.Function.Name)
				result := runTool(call)
				messages = append(messages, Message{
					Role:       "tool",
					ToolCallID: call.ID,
					Content:    result,
				})
			}
		}
	}
}
