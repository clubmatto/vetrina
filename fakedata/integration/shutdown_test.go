package integration_test

import (
	"io"
	"os"
	"os/exec"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStreamGracefulShutdown(t *testing.T) {
	cmd := exec.Command(binaryPath, "-S", "email")
	stdoutR, stdoutW := io.Pipe()
	cmd.Stdout = stdoutW
	cmd.Stderr = os.Stderr

	err := cmd.Start()
	require.NoError(t, err)

	go func() {
		buf := make([]byte, 1)
		stdoutR.Read(buf)     // wait for first byte of output
		cmd.Process.Signal(os.Interrupt)
		io.Copy(io.Discard, stdoutR) // drain pipe so fOut.Flush doesn't block
	}()

	err = cmd.Wait()
	require.NoError(t, err, "stream mode should exit gracefully on SIGINT")
	assert.Equal(t, 0, cmd.ProcessState.ExitCode())
}

