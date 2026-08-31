# ChangeLog

## Lovable.dev
- Scaffolded with Lovable.dev (Supabase/React/Tailwind/Shadcn)
- Do NOT change the UI library; strictly stick to Shadcn/Tailwind
- We use Supabase for the backend
- This project uses a dual-database infrastructure:
  - Legacy: Regular Supabase client (still used for auth and other non-movable aspects)
  - Modern: Vigil Supabase client (everything, new databases and tables to be added here)
- For all new database tables needed, assume they will be added to the Modern (Vigil) database. Place the required migration code in the "/database/Jule's Desired Migrations" folder

## BlackBox

- Used for following commits:
  - Commit 0515a43dcd2cb6303aff13a329f8bfacdfec9ae1
  - Commit f5f01b68eac345aa345ac4c6b16e6e774852f991
  - Commit e4513b432d77b2b1c4480c1cfc9a4d31d0e86098
  - Commit 95a4b5fcc0bff2ac19a9ef4890e49d3f18278bf6
  - Commit 483f05246b5b4ea2990ff3622629c23e11f8295e
  - Commit fc1cb46b2f65e9598c935055053a54fd9b9c3fa2
  - Commit 7d842a97edf60f519899f0a0f41a7ed9b5722e69
  - Commit bb9e40a90b3043cf93db908d1fe7542715588ca3
  - Commit 93da3627b6e6f9d6f2e19c101359a97c1e606ddc
  - Commit 6978de4074fab2be8c6f69e46c7c5f4fda18b883
  - Commit 5eb8d13d03aa7cb14598b3d435b68319b9ed6959
  - Commit 6518ee5afde48a81d02455b9ab8e24c7c0b2d9a4
  - Commit eafc752f804c145fe9945a9fd0f610a0c9b2b7e4
  - Commit 608a44e0d422a86bc25302db8917327d4bc2ab69
  - Commit dda2429d47fd2fdc7cc7ca60a8766c115558f265
  - Commit f7ef51a8373e69d45c6cd8b5d419e162a7385f3a
  - Commit 5867d933240e614af7dc670ce102841fe2583c0f
  - Commit ec4620034585fa4dd0f31461f14d3b1eb7fc3e17
- Created some major errors so there were some rollbacks too:
  - Commit 6c05d30f496b4cd0fbb0ca7510e7768d593365ef
  - Commit a625812ecc64afdb20b7d3fe7aba1007cbdbbf76
  - Commit 3ffde1a5c5ef3d224f06190d480afa988b4916ff
- These changes were made in BlackBox's style. Review changes for errors and unfunctional features.

## Windsurf Cascade

### SWE-1.5 [Winfsurf's In-house agentic AI model]

- Commit db9ac644d80da9987656f30332acb1a2b5405ca5
- Commit 3929023dfc4d104eb03e7f8b4a3a43be107c2776
- Commit 987ba812ac59787062334138061296218cdf1236
- Commit 74a82bd0ba16b34649f1461a3ea7d7c965ea7205
- Commit a61b3338f901382e2865fb9bf0222698f5ca291e

### GPT-5.2 Low Reasoning [OpenAI's In-house AI model]

- Commit 08b115a62669fa7a5cebe7e81fd49cecf23c1e3d
- Commit 3eea40708ecd84ea24250fe3d2201a28c2be3496
- Commit fe1cb98f2c7b1abb469099904c358f6996217d35
- Commit 5d731a1077a5dbda5ae825cc13cb5940cb5e1f36
- Commit 8ea30dd8a514fdba93e4c4f02456f1292e129612
- Commit a48c59861003fee537ee012c37005d2877b4c624
- Commit d913731159bc3eb3e3b2cc839e9d81fe73a4e43c
- Commit f5440645493236ca79d24a04aebf4a861419cdbc
- Commit bbd428a1941c4d8d08719b9ddd5f05ab49228126
- Commit 866d7a680d807a1ded396b5bd68ed68cd56cf3b3
- Commit 5ea6e7d1cf3e2d51a8eab88900f72bd95cb7ad11
- Commit 257d93ff9505c77be0bb8939c7d0bba9da427179
- Commit ed03bb36a4972bbbea03b310d934890e99f3bf7b
