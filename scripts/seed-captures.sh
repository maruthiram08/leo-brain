#!/bin/bash
# Seed script for Leo test captures
# Run: chmod +x scripts/seed-captures.sh && ./scripts/seed-captures.sh

API_URL="https://leo-brain.vercel.app"
TOKEN="LeoExt2026SecureToken"

echo "Seeding Leo with test captures..."

# 1. Tech/Programming
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"React Server Components allow you to render components on the server, reducing the JavaScript bundle sent to the client. This is a game-changer for performance.","url":"https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023","title":"React Labs: What We Have Been Working On","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: React Server Components"

# 2. TypeScript
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"TypeScript 5.0 introduces decorators that finally align with the TC39 proposal. The new satisfies operator helps you validate types while preserving inference.","url":"https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/","title":"Announcing TypeScript 5.0","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: TypeScript 5.0"

# 3. AI/ML
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Retrieval Augmented Generation (RAG) combines the power of large language models with external knowledge bases. By retrieving relevant documents before generating, RAG reduces hallucinations.","url":"https://arxiv.org/abs/2005.11401","title":"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: RAG explainer"

# 4. Design
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Dieter Rams 10 principles of good design: Good design is innovative, makes a product useful, is aesthetic, makes a product understandable, is unobtrusive, is honest, is long-lasting, is thorough, is environmentally friendly, and involves as little design as possible.","url":"https://www.vitsoe.com/us/about/good-design","title":"Good design - Vitsoe","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Dieter Rams design principles"

# 5. Productivity
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"The Eisenhower Matrix: Urgent+Important (Do First), Important+Not Urgent (Schedule), Urgent+Not Important (Delegate), Neither (Eliminate). Focus on quadrant 2 for long-term success.","url":"https://www.eisenhower.me/eisenhower-matrix/","title":"The Eisenhower Matrix","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Eisenhower Matrix"

# 6. Finance
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Compound interest is the eighth wonder of the world. He who understands it, earns it. He who does not, pays it. A 7% annual return doubles your money every 10 years.","url":"https://www.investopedia.com/terms/c/compoundinterest.asp","title":"Compound Interest Definition","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Compound interest"

# 7. Health
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Sleep is the foundation of health. 7-9 hours for adults. Blue light before bed suppresses melatonin. Keep bedroom cool (65-68°F). Consistent sleep schedule matters more than duration.","url":"https://www.sleepfoundation.org/how-sleep-works","title":"How Sleep Works - Sleep Foundation","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Sleep science"

# 8. Next.js
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Next.js App Router uses React Server Components by default. Use \"use client\" directive for client components. Layouts are preserved across navigation. Loading.tsx creates instant loading states.","url":"https://nextjs.org/docs/app","title":"Next.js App Router Documentation","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Next.js App Router"

# 9. Postgres
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"PostgreSQL pgvector extension enables vector similarity search. Use HNSW index for fast approximate nearest neighbor queries. Cosine similarity is best for normalized embeddings.","url":"https://github.com/pgvector/pgvector","title":"pgvector: Open-source vector similarity search for Postgres","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: pgvector"

# 10. Electron
curl -s -X POST "$API_URL/api/capture" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"selection","content":"Electron app signing on macOS: Use codesign with ad-hoc identity for local testing. For distribution, notarization requires Apple Developer ID. TCC permissions need proper entitlements.plist.","url":"https://www.electronjs.org/docs/latest/tutorial/code-signing","title":"Code Signing - Electron Documentation","timestamp":'$(date +%s000)',"source":"seed_script","device":"desktop"}'
echo "✓ Added: Electron code signing"

echo ""
echo "✅ Done! Added 10 test captures."
echo ""
echo "Test Recall with these URLs:"
echo "  - https://react.dev (should recall React Server Components)"
echo "  - https://typescript.org (should recall TypeScript 5.0)"
echo "  - https://openai.com (should recall RAG article)"
echo "  - https://figma.com (should recall Dieter Rams design)"
echo "  - https://notion.so (should recall Eisenhower Matrix)"
echo "  - Any investing site (should recall compound interest)"
echo "  - https://nextjs.org (should recall App Router)"
