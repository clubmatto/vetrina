Type "# Override any column's generator with the -c flag"
Enter

Sleep 1s

Type "# Fine-tune generators per column or even per-schema.table.column"
Enter

Sleep 1s

Type 'fakedata-pro --dsn sqlite:pro.db -t users:5 -t products:5 -t orders:10 -c orders.quantity=int:1,5 --dry-run'
Enter

Sleep 4s
