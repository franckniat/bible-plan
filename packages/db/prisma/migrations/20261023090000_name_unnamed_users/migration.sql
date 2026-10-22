-- Accounts made by signing in with an e-mail link had no name (the link only
-- gives the address). Name them like the application now does at sign-up
-- (packages/auth/src/display-name.ts): the part of the address before the "@",
-- read as words ("jean.dupont+tag@example.com" -> "Jean Dupont"), or a word in
-- their language when nothing is left. The person can change it in their profile.
UPDATE "user"
SET "name" = COALESCE(
  NULLIF(
    btrim(
      initcap(
        regexp_replace(
          split_part(split_part("email", '@', 1), '+', 1),
          '[._-]+',
          ' ',
          'g'
        )
      )
    ),
    ''
  ),
  CASE WHEN "locale" = 'en' THEN 'User' ELSE 'Utilisateur' END
)
WHERE btrim("name") = '';
