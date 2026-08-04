# MakanMana food assistant

## Current MVP

The first slice is deliberately usable without an LLM account or paid API:

- It accepts food-discovery requests only.
- It extracts supported cuisine, dish, Halal, open-now, price-level, and distance preferences from an allow-list.
- It asks the user to confirm those preferences before searching.
- It calls the existing `PlacesService`, so live place data still goes through the protected Supabase Places proxy.
- It returns at most three nearby matches and explains them using observable place facts.
- It uses one controlled food-preference catalogue shared by Profile, Home/Search ranking, and the assistant.
- Signed-in users can add or remove confirmed labels in Profile. The rows persist in Supabase with user-scoped RLS.
- Guests can remember confirmed preferences for the current app session, but must sign in to save them across sessions or devices.
- Hard preferences (`Halal required` and `Vegetarian`) filter results when the place data supports the claim. Soft cuisine, dish, taste, supper, and open-now interests boost matching places without excluding other food.
- An explicit current chat request replaces conflicting soft saved interests for that search. Saved hard constraints remain active.
- The assistant presents inferred labels as candidates and never stores them until the user presses the separate save/remember control.
- It redirects non-food requests to food suggestion prompts.

This version is structured preference matching, not an LLM or RAG system. That is intentional: it validates whether users find conversational food discovery and preference memory useful before adding model cost and operational complexity.

## LLM and RAG boundary for the next phase

Keep all model credentials server-side:

```text
Expo app
  -> authenticated Supabase Edge Function: food-agent
    -> food-scope and safety gate
    -> retrieve from curated MakanMana food knowledge
    -> LLM produces validated structured preferences or a food answer
    -> existing PlacesService tool fetches current restaurants
  <- typed response with answer, preference candidates, and place IDs
```

The Edge Function should require a user JWT, rate-limit per user, cap input and output size, validate the model response with a schema, and never expose provider errors or secrets to the app. It should receive only the preference keys needed for the request, not unnecessary profile/account data. Preference candidates must continue to use the same confirmation-and-save interface before persistence.

Use RAG for curated, attributable MakanMana knowledge such as cuisine guides, dietary definitions, allergen notes, and editorial food content. Do not copy Google review text into a vector database. Current restaurant facts, hours, distance, ratings, and Google-provided review content should continue to come from the Places integration with its required attribution.

Start with direct structured model calls and the existing service interface. LangChain or LangGraph is not required for this single search flow. Consider LangGraph only after the product genuinely needs resumable multi-step planning or several reliable tools. n8n is better reserved for background content ingestion and scheduled knowledge refreshes, not the live chat request path.
