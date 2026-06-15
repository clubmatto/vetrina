Type "# Custom templates for any output format"
Enter

Sleep 1s

Type "cat > user.tmpl << 'EOF'"
Enter

Type '{"name": "{{.FirstName}} {{.LastName}}", "email": "{{.Email}}", "country": "{{.Country}}"}'
Enter

Type "EOF"
Enter

Sleep 1s

Type "# Generate JSON with templates"
Enter

Sleep 500ms

Type "fakedata -T user.tmpl -n 3"
Enter

Sleep 2s

Type "# Perfect for API responses and test fixtures"
Enter

Sleep 3s
