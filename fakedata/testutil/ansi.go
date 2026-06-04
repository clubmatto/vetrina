package testutil

// TODO we have this in two places, better extract it?
func StripANSICodes(s string) string {
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
