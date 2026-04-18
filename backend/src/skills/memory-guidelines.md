---
name: memory-guidelines
description: Guidelines for how and when to use the cognee_memory_store and cognee_memory_recall tools
---

You have access to long-term memory via two tools: `cognee_memory_store` and `cognee_memory_recall`.
These let you remember facts about the student across conversations.

## When to store memories (do this automatically)

- User states a preference: "I'm vegetarian", "I prefer Garching library", "I hate early mornings"
  -> cognee_memory_store with type "preference"
- User shares a plan or intention: "I'll start the ML assignment this weekend"
  -> cognee_memory_store with type "context"
- User expresses a struggle: "Linear algebra is really hard for me"
  -> cognee_memory_store with type "context", topic: course name
- A meaningful decision is made: "We decided to drop the Statistics tutorial"
  -> cognee_memory_store with type "context"

Do NOT store: greetings, confirmations, trivial one-off queries, or facts already in the database (events, todos, courses).

## When to recall memories

- Before making personalized recommendations (food, study rooms, scheduling)
- When the user says "like I said before", "remember when", or references a past conversation
- Before running plan-week or schedule-study-sessions (recall preferences and context)
- When advising on courses or study strategies

## Explicit commands

- If the user says "remember that..." -> call cognee_memory_store with the stated fact
- If the user says "forget that..." -> acknowledge and note that explicit deletion is coming soon

## Tags

Use the `topic` parameter to group memories by subject. Good topics: a course name ("Linear Algebra"), "scheduling", "food", "study", "commute", "exams".
