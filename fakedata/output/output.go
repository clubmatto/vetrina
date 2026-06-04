package output

import (
	"fmt"
	"io"
	"os"
)

type Writer struct {
	stdout io.Writer
	stderr io.Writer
	tty    bool
}

var Default *Writer

func Init(tty bool) {
	Default = &Writer{
		stdout: os.Stdout,
		stderr: os.Stderr,
		tty:    tty,
	}
}

func (w *Writer) Printf(format string, args ...interface{}) {
	if !w.tty {
		format = stripANSI(format)
	}
	fmt.Fprintf(w.stdout, format, args...)
}

func (w *Writer) Print(args ...interface{}) {
	s := fmt.Sprint(args...)
	if !w.tty {
		s = stripANSI(s)
	}
	fmt.Fprint(w.stdout, s)
}

func (w *Writer) Println(args ...interface{}) {
	s := fmt.Sprint(args...)
	if !w.tty {
		s = stripANSI(s)
	}
	fmt.Fprintln(w.stdout, s)
}

func (w *Writer) Eprintf(format string, args ...interface{}) {
	s := fmt.Sprintf(format, args...)
	fmt.Fprint(w.stderr, s)
}

func (w *Writer) DataWriter() io.Writer {
	return w.stdout
}

func (w *Writer) IsTTY() bool {
	return w.tty
}

func Printf(format string, args ...interface{}) {
	if Default != nil {
		Default.Printf(format, args...)
	} else {
		fmt.Printf(format, args...)
	}
}

func Print(args ...interface{}) {
	if Default != nil {
		Default.Print(args...)
	} else {
		fmt.Print(args...)
	}
}

func Println(args ...interface{}) {
	if Default != nil {
		Default.Println(args...)
	} else {
		fmt.Println(args...)
	}
}

func Eprintf(format string, args ...interface{}) {
	if Default != nil {
		Default.Eprintf(format, args...)
	} else {
		fmt.Fprintf(os.Stderr, format, args...)
	}
}

func DataWriter() io.Writer {
	if Default != nil {
		return Default.DataWriter()
	}

	return os.Stdout
}

func IsTTY() bool {
	if Default != nil {
		return Default.IsTTY()
	}

	return false
}

func stripANSI(s string) string {
	result := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '\x1b' && i+1 < len(s) && s[i+1] == '[' {
			i += 2
			for i < len(s) && s[i] >= 0x20 && s[i] <= 0x3F {
				i++
			}
			if i < len(s) {
				i++
			}

			i--

			continue
		}
		result = append(result, s[i])
	}

	return string(result)
}
