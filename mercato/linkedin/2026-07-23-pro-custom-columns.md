---
title: "Fine-tune your data with Custom Columns"
platform: linkedin
topics:
  - fakedata-pro
---

We build FakeData Pro so that you can point it to your database and it 
just works but sometimes you need a little more control on what the data 
FakeData pro generates for you.

That's what Custom Columns in FakeData Pro are for. The syntax is as 
intuitive as you'd expect: 

fakedata --dsn sqlite:pro.db -t products:5 -c products.price=int:10,100

Lear more about FakeData Pro: https://matto.club/products/fakedata/
