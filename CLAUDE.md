# Mortgage Guidelines Project

This repository is a mortgage origination assistant that contextualizes loan guidelines across multiple investor types and helps produce accurate client communications.

## Terminology
- "Portfolio loan" = bank statement loan (client-facing term)
- "Non-QM" = Non-Qualified Mortgage (industry term for loans outside Fannie/Freddie guidelines)
- Investors include: ARC, Onsloh, Deephaven, Acra Lending, A&D Mortgage, Newrez, and others

## Structure
- `guidelines/` -- Investor-specific and product-specific guideline references
- `templates/` -- Reusable document templates (business narratives, needs lists, etc.)
- `emails/` -- Client and referral partner email drafts
- `App.jsx` / `index.html` -- Future web application for guideline lookup and email generation

## Key Conventions
- Always refer to bank statement loans as "portfolio loans" in client-facing content
- Never disclose investor names to clients in email drafts
- Include specific documentation checklists in client emails
- Business narrative templates should be customizable per borrower
- Guidelines should note which investors allow non-occupant co-borrowers
