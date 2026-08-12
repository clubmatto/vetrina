Set TypingSpeed 5ms

Type "# Point fakedata at Postgres: it introspects the schema and fills the line_items fact table"
Enter

Sleep 500ms

Type "# We control cardinality with -c: 50k orders, 10k products drawn from pools"
Enter

Sleep 500ms

Type "fakedata --dsn postgres://localhost/pro_demo --schema public -t line_items:5000000 -c public.line_items.order_id=distinct:50000:uuidv4 -c public.line_items.product_id=distinct:10000:uuidv4 -c public.line_items.date=date:2025-01-01,2026-08-01 -c public.line_items.quantity=int:1,10 -c public.line_items.total=float:8,2"
Enter

Wait+Screen@600s /Generated 5/

Sleep 500ms

Type "# Now a query over the freshly generated data"
Enter

Sleep 500ms

Type `psql -d pro_demo -c "SELECT date_trunc('month', date) AS month, count(*) AS line_items, sum(total) AS total FROM line_items GROUP BY 1 ORDER BY 1;"`
Enter

Sleep 500ms

Set TypingSpeed 25ms

Type "# 🎉 Data is in Postgres, ready for query work 🎉"
Enter

Sleep 2s
