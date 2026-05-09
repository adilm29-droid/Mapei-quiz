-- =============================================================
-- 004 — Seed Quiz 2: Mapei Ceramic Line Beginner Quiz
--
-- 30 questions imported from supabase/seeds/mapei_quiz_2_beginner.json
-- All very_easy (1pt each). Total max_score: 30.
-- Idempotent — re-runs replace the seed quiz cleanly.
-- =============================================================

DELETE FROM quizzes WHERE title = 'Mapei Ceramic Line — Beginner Quiz (Very Simple)';

WITH q AS (
  INSERT INTO quizzes (title, week_number, is_unlocked, max_score)
  VALUES ('Mapei Ceramic Line — Beginner Quiz (Very Simple)', 2, FALSE, 30)
  RETURNING id
)
INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, category, difficulty, points, order_index) VALUES
((SELECT id FROM q), 'What is the standard bag size of Keraflex Maxi S1 Zero?', '15 kg', '20 kg', '25 kg', '30 kg', 'C', 'Keraflex Maxi S1 Zero comes in a 25 kg bag — the standard cementitious adhesive bag size.', 'Master', 'very_easy', 1, 0),
((SELECT id FROM q), 'What is the bag size of Mapeset?', '15 kg', '20 kg', '25 kg', '10 kg', 'C', 'Mapeset is supplied in a 25 kg bag.', 'Master', 'very_easy', 1, 1),
((SELECT id FROM q), 'What colours does Ultralite S2 come in?', 'White only', 'Grey only', 'White or Grey', '16 colours', 'C', 'Ultralite S2 is available in both white and grey — like most Mapei cementitious adhesives.', 'Master', 'very_easy', 1, 2),
((SELECT id FROM q), 'What colours does Adesilex P10 come in?', 'White only', 'Grey only', 'White or Grey', 'Beige', 'A', 'Adesilex P10 is white only — the white powder is designed to enhance the colour of glass mosaics.', 'Master', 'very_easy', 1, 3),
((SELECT id FROM q), 'Mapesil AC is which type of product?', 'Tile adhesive', 'Grout', 'Silicone sealant', 'Primer', 'C', 'Mapesil AC is a one-component silicone sealant supplied in a cartridge.', 'Master', 'very_easy', 1, 4),
((SELECT id FROM q), 'Mapesil LM is which type of product?', 'Cementitious adhesive', 'Epoxy grout', 'Silicone sealant', 'Polyurethane adhesive', 'C', 'Mapesil LM is a one-component neutral silicone sealant.', 'Master', 'very_easy', 1, 5),
((SELECT id FROM q), 'Keracolor FF is which type of product?', 'Adhesive', 'Grout', 'Sealant', 'Primer', 'B', 'Keracolor FF is a cementitious grout — it fills the joints between tiles.', 'Master', 'very_easy', 1, 6),
((SELECT id FROM q), 'Granirapid is famous for being…', 'The cheapest adhesive', 'Fast-setting', 'White only', 'A grout', 'B', 'Granirapid is Mapei''s fast-setting two-component adhesive — that''s why it carries the ''F'' in its C2F S1 classification.', 'Master / Distinctions', 'very_easy', 1, 7),
((SELECT id FROM q), 'Which letter in a Mapei adhesive code means ''cementitious''?', 'C', 'R', 'D', 'G', 'A', 'C = Cementitious adhesive. R = Reaction resin (Keralastic). D = Dispersion. G = Grout.', 'Code Decoder', 'very_easy', 1, 8),
((SELECT id FROM q), 'Which letter in a Mapei adhesive code means ''reaction resin'' (e.g. Keralastic)?', 'C', 'R', 'F', 'T', 'B', 'R = Reaction resin adhesive — used for Keralastic and Keralastic T (two-component polyurethanes).', 'Code Decoder', 'very_easy', 1, 9),
((SELECT id FROM q), 'What does the number ''2'' mean in a code like C2TE?', 'Two-component', 'Improved performance', 'Class 2 deformability', 'Two colours', 'B', '1 = normal performance, 2 = improved performance per EN 12004.', 'Code Decoder', 'very_easy', 1, 10),
((SELECT id FROM q), 'What does the letter ''T'' mean in a code like C2TE?', 'Thick-bed', 'Slip-resistant (no vertical slip)', 'Two-component', 'Tile-on-tile', 'B', 'T = slip-resistant — tiles don''t slide down a wall while the adhesive is wet.', 'Code Decoder', 'very_easy', 1, 11),
((SELECT id FROM q), 'What does the letter ''E'' mean in a code like C2TE?', 'Easy mix', 'Extended open time', 'Exterior only', 'Epoxy', 'B', 'E = extended open time (>30 minutes). Adhesives without E typically have only ~20 min open time.', 'Code Decoder', 'very_easy', 1, 12),
((SELECT id FROM q), 'How many components does Granirapid have?', 'One', 'Two', 'Three', 'Four', 'B', 'Granirapid is two-component — Part A powder + Part B latex.', 'Master', 'very_easy', 1, 13),
((SELECT id FROM q), 'How many components does Keralastic have?', 'One', 'Two', 'Three', 'Four', 'B', 'Keralastic is a two-component polyurethane: Component A (resin) + Component B (hardener).', 'Master', 'very_easy', 1, 14),
((SELECT id FROM q), 'How many components does Mapesil AC have?', 'One', 'Two', 'Three', 'Four', 'A', 'Mapesil AC is one-component — comes ready-to-use in a cartridge, cures with humidity in the air.', 'Master / Mix Prep', 'very_easy', 1, 15),
((SELECT id FROM q), 'What is the cartridge size of Mapesil AC?', '280 ml', '310 ml', '400 ml', '500 ml', 'B', 'Mapesil AC and Mapesil LM both come in 310 ml cartridges. Mapesil Z Plus is the smaller 280 ml.', 'Master', 'very_easy', 1, 16),
((SELECT id FROM q), 'What is the cartridge size of Mapesil Z Plus?', '280 ml', '310 ml', '400 ml', '500 ml', 'A', 'Mapesil Z Plus comes in a 280 ml cartridge — slightly smaller than AC and LM (both 310 ml).', 'Master', 'very_easy', 1, 17),
((SELECT id FROM q), 'Which Mapei product is known as the ''lightweight'' adhesive line?', 'Granirapid', 'Keraflex', 'Ultralite', 'Mapeset', 'C', 'The Ultralite range (S1, S2, S2 Quick) are Mapei''s lightweight adhesives — 15 kg bags with the same coverage as a 25 kg conventional bag.', 'Master', 'very_easy', 1, 18),
((SELECT id FROM q), 'Kerapoxy is what kind of chemistry?', 'Cementitious', 'Epoxy', 'Silicone', 'Polyurethane', 'B', 'Kerapoxy is a two-component epoxy resin — used as both grout and adhesive.', 'Master', 'very_easy', 1, 19),
((SELECT id FROM q), 'Kerabond Plus is a one-component _____ adhesive.', 'Polyurethane', 'Cementitious', 'Epoxy', 'Silicone', 'B', 'Kerabond Plus is a one-component cementitious adhesive (C2E classification).', 'Master', 'very_easy', 1, 20),
((SELECT id FROM q), 'What is the standard storage / shelf-life of most Mapei cementitious adhesives in this range?', '6 months', '12 months', '18 months', '24 months', 'B', 'Cementitious adhesives store 12 months. Reaction-resin products (Keralastic, Kerapoxy) and Mapesil AC store 24 months.', 'Master', 'very_easy', 1, 21),
((SELECT id FROM q), 'Which standard sets the rules for cementitious tile adhesive classification (C1, C2, etc.)?', 'ISO 9001', 'EN 12004 / ISO 13007', 'ASTM C1248', 'EN 15651', 'B', 'EN 12004 / ISO 13007 is the European/international standard for tile adhesive classification. EN 15651 is for sealants. ASTM C1248 is the non-staining test for silicones.', 'Code Decoder', 'very_easy', 1, 22),
((SELECT id FROM q), 'What does ''EC1 Plus'' on a Mapei product label refer to?', 'Electrical conductivity rating', 'Very low VOC emission certification (EMICODE)', 'Exterior class 1', 'Energy-class 1', 'B', 'EMICODE EC1 Plus = very low emission of volatile organic compounds — the highest indoor air-quality rating. Almost all Mapei products in this range carry it.', 'Master', 'very_easy', 1, 23),
((SELECT id FROM q), 'What is the minimum application temperature for most Mapei cementitious adhesives?', '0 °C', '+5 °C', '+10 °C', '+12 °C', 'B', 'Most cementitious adhesives apply at +5 °C minimum. Keralastic needs +10 °C minimum, Kerapoxy needs +12 °C minimum.', 'Master', 'very_easy', 1, 24),
((SELECT id FROM q), 'Granirapid is mixed by pouring the powder into…', 'Clean water', 'Latex (Part B)', 'Isolastic', 'Fugolastic', 'B', 'Granirapid uses no water — pour the powder (Part A) into the latex (Part B) and mix mechanically.', 'Mix Prep', 'very_easy', 1, 25),
((SELECT id FROM q), 'After mixing a cementitious adhesive, what should you do BEFORE applying it?', 'Apply immediately', 'Let it rest for ~5 minutes, then re-mix', 'Wait 30 minutes', 'Add more water', 'B', 'Standard Mapei procedure: mix → rest 5 min → re-mix. The rest period lets the polymers fully activate.', 'Mix Prep', 'very_easy', 1, 26),
((SELECT id FROM q), 'Keracolor FF is available in how many colours from the MAPEI range?', '4', '10', '16', '40', 'C', 'Keracolor FF is available in 16 colours from the MAPEI range. Mapesil AC has the largest palette at 40 + transparent.', 'Master', 'very_easy', 1, 27),
((SELECT id FROM q), 'Which Mapei product in this range is described as a ''CO2-fully-offset'' adhesive?', 'Granirapid', 'Keraflex Maxi S1 Zero', 'Ultralite S1', 'Mapeset', 'B', 'The ''Zero'' in Keraflex Maxi S1 Zero refers to its CO2-fully-offset status — Mapei''s eco-conscious version of Keraflex Maxi.', 'Distinctions', 'very_easy', 1, 28),
((SELECT id FROM q), 'Which symbol in the workbook means a use is EXPLICITLY FORBIDDEN by the TDS?', '✓', '✗', '—', '?', 'B', '✓ = supported, ✗ = explicitly forbidden, ''—'' = not mentioned (use cautiously). Standard Mapei TDS-matrix convention.', 'README / Where to Use', 'very_easy', 1, 29);

