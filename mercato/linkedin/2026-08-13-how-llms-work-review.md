---
title: "How Large Language Models Work — our review (2.5/5)"
platform: linkedin
topics:
  - llm
  - book-review
---

📢 Quick review of "How Large Language Models Work" 📢

We read this book because we were looking for a mental model (pun unintended)
of how LLMs actually *work*. We had basic questions like: what's really a large
language models? What are their main components? How does a model runtime look
like? What does training mean?

This book almost got us there, but we're left with some gaps.

**The good:**

- The first three chapters are genuinely solid. They really help you understand
  what is and isn't probabilistic about these models.
- A great introduction if you know nothing about LLMs. We nodded our way through
  these chapters.

**The not-so-good:**

- The writing quality drops noticeably from chapter 4 onward.
- It felt too long.
- The chapters on ethics and other generic overviews added little value.
- Two things it failed to give us: how the *runtime* of an LLM actually works
  (we all interact with models through an API but what *are* the models really
  doing?), and how you'd go about setting up training pipeline infrastructure.

**Conclusion:** if you're new to LLMs and want the intuition behind "it's just
next-token prediction, with probability everywhere" read the first three
chapters and stop. For the operational side like running models, training
pipelines, this isn't the book but stay tuned because we've got a long 
reading list we're going trough 💪
