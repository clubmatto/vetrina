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

// snip: message

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// endsnip: message

// snip: request

type chatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// endsnip: request

type chatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

// chat sends the conversation so far to the DeepSeek chat completions API
// and returns the assistant's reply.
func chat(messages []Message) (Message, error) {
	key := os.Getenv("DEEPSEEK_API_KEY")
	if key == "" {
		return Message{}, fmt.Errorf("DEEPSEEK_API_KEY is not set")
	}

	body, err := json.Marshal(chatRequest{Model: model, Messages: messages})
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

// snip: main

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

		response, err := chat(messages)
		if err != nil {
			panic(err)
		}
		messages = append(messages, response)
		fmt.Println(response.Content)
	}
}

// endsnip: main
