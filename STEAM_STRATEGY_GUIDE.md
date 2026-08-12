# Skunked: Way of the Spray — Steam & Store Strategy Guide

## 1) Positioning

Skunked: Way of the Spray is a fast, stylish, arcade-action platformer built around momentum, combo chaining, and boss pressure. It sits in the lane between polished browser action games and modern Steam deck-friendly indie brawlers.

Core identity:
- Ninja skunk protagonist
- Quick, readable action combat
- High-score chase and replay value
- Boss-driven progression with a clear escalation curve
- Strong replayability on desktop, mobile, and Steam Deck

Primary hook:
- "A slick, anarchic ninja skunk action-platformer with spray-powered combat, explosive boss fights, and a score-chasing loop."

## 2) Target audience

Primary audience:
- Steam players who like fast action games, boss rushes, and score attack loops
- Players who enjoy arcade combos and skill expression
- Indies who like colorful art direction and strong personality

Secondary audience:
- Mobile/Android players who want a quick, polished action game
- Browser players looking for a lightweight, no-friction arcade experience
- Steam Deck owners who want a game that runs well with a controller

## 3) Store and platform strategy

### Steam
Purpose:
- Establish the premium desktop identity
- Ensure strong controller support and clear gamepad feel
- Use Steamworks for leaderboards, achievements, and launch polish

Steam pillars:
- Fast to learn, hard to master
- High fluidity and readability
- Boss fights with clear telegraphs and escalating pressure
- Strong local leaderboard and replayability

### Android / Google Play
Purpose:
- Reach a mobile audience with a lighter, on-the-go action loop
- Test build stability and user acquisition funnels
- Use the same core game loop with touch-friendly controls

Android positioning:
- Mobile-first access to the same fast action experience
- Emphasize responsive touch controls and short-run sessions
- Keep the install friction low and the game loop instant

### Web / Browser
Purpose:
- Distribution and viral reach
- No-install exposure
- Serve as a live demo / discovery layer

Web positioning:
- Instant play
- Broad compatibility
- Good for community demos, social links, and storefront discovery

## 4) Core value proposition

Skunked sells itself on three things:
1. Distinct identity — a ninja skunk with spray-based combat and exaggerated personality
2. Fast gameplay feedback — immediate, readable combat and score payoff
3. Repeatability — boss fights, combo system, and high-score chase create long-term appeal

## 5) Steam page messaging

### Short description
Skunked: Way of the Spray is a fast-paced ninja skunk action platformer with combo-driven combat, boss encounters, and a score-chasing arcade loop.

### Long description structure
1. Opening hook
2. Core gameplay loop
3. Combat systems
4. Boss progression
5. Control options and platform support
6. Why it feels good to play

Suggested long-form framework:
- "Run. Jump. Spray. Survive."
- "As the last Ninja Skunk, you carve through waves of enemies, chain brutal combos, and survive escalating boss encounters."
- "Use melee, dash attacks, and ranged spray shots to carve through corrupted woodland arenas, collect power-ups, and rip through each stage with momentum."
- "Master the Shadow Strike, build combo tiers, and use the score chase to keep replaying the run."
- "Built for keyboard, controller, touch, and Steam Deck-friendly play."

## 6) Steam launch position

### Recommended launch framing
- Indie action game with strong personality and replayability
- Not a heavy story-driven RPG
- More like a tight arcade action experience with boss pressure and score chase
- Emphasize controls, responsiveness, and moment-to-moment flow over narrative complexity

### Best angle for marketing
- "Arcade action with personality and a strong skill ceiling"
- "High-speed skunk ninja boss gauntlet"
- "One-button-to-learn, hard-to-master skill loop"

## 7) Store page essentials

### Steam capsules / visuals
Need:
- 1 main hero image or title art
- 1 feature graphic for key gameplay feel
- 3–5 gameplay screenshots showing:
  - combat flow
  - boss encounter
  - environmental variety
  - score chase / power-up moment
  - controller gameplay or Steam Deck layout

### Must-have screenshot categories
- Core combat
- Boss fight
- Score / combo moment
- Movement and platforming
- Character identity and world flavor

### Tag recommendations
Suggested tags:
- Action
- 2D Platformer
- Beat 'em up
- Indie
- Arcade
- Fast-Paced
- Boss Rush
- Score Attack
- Singleplayer
- Controller Friendly

## 8) Steamworks checklist

This is the concrete infrastructure checklist before launch.

### Features to set up
- App metadata and store page
- App ID and package configuration
- Steam Input action set
- Achievements
- Leaderboards
- Steam overlay support
- Controller support validation
- Steam Deck compatibility check
- Launch build validation

### Achievement guidance
Achievements should map directly to core player motivations:
- First Blood
- Enemy Slayer
- Exterminator
- Boss Breaker
- Combo Master
- Golden Idol Hunter
- Survivalist
- Campaign Clear

The codebase already includes the Steam achievement plumbing and leaderboard submission paths; the remaining release work is platform-side setup and validation.

## 9) Controller and input strategy

Steam input is a launch requirement for desktop credibility.

Required checks:
- Confirm all movement and attack mappings work as designed
- Validate gamepad default mappings on Xbox / PlayStation / Steam Controller
- Confirm pause and menu flows are stable in controller mode
- Test Steam Deck control feel, especially in gameplay-heavy sections

Steam Input responsibilities:
- Mapping action set must match the uploaded VDF definition
- Settings and action names should align with the in-game expectations
- The game should gracefully fall back to browser Gamepad API if Steam Input is unavailable

## 10) Build and release gate

Recommended release gate before Steam launch:

### Build validation
- Fresh Steam desktop build passes without errors
- Key gameplay loop tested on a clean build
- Controller input works in desktop and Deck mode
- Achievements and leaderboard hooks tested
- No crash path in boss fights or stage transitions

### Store validation
- Screenshots load correctly
- Capsule art and background are readable at small size
- Short description and tags match the actual feel of the game
- Steam page description is consistent with the final build

### Policy / legal validation
- Privacy policy is up to date
- Content rating is set appropriately
- App metadata and developer info are complete
- Release notes are ready for test and launch

## 11) Launch sequencing

### Phase 1 — Internal / Closed Test
- Validate Steam build
- Validate controls and controller support
- Check achievements and leaderboard wiring
- Review game feel and performance on multiple machines

### Phase 2 — Public Playtest / Demo
- Publish a small public test build or demo
- Gather feedback on difficulty, readability, and boss pacing
- Adjust balancing if needed before full launch

### Phase 3 — Full Steam Launch
- Launch with polished store page
- Ship with complete achievement set and leaderboard support
- Push a launch-day communication package

### Phase 4 — Post-launch support
- Monitor reviews and feedback
- Tune boss pacing or UI clarity if necessary
- Prepare seasonal patch content or balancing updates if warranted

## 12) Recommended launch copy

This is the strongest version of the pitch for the store and public messaging.

Headline:
- Skunked: Way of the Spray

Subhead:
- Fast-paced ninja skunk action with combo combat, bosses, and score-chasing replay value

Core CTA:
- Run. Jump. Spray. Survive.

## 13) Immediate next actions

1. Finalize Steam page copy and tags
2. Upload the controller config and verify Steam Input mapping
3. Validate the Steam build on a clean desktop environment
4. Confirm achievements and leaderboard setup in Steamworks
5. Prepare screenshots and hero art
6. Use the current test AAB and current build state as the release-quality gate before public distribution

## 14) Summary

The game already has the right core ingredients for a strong Steam launch: a distinct identity, readable combat, boss-driven progression, controller compatibility, and replayability. The strategy should focus on clarity, control feel, and an arcade-driven pitch instead of overexplaining the story. This keeps the brand punchy, the game readable, and the storefront message compelling.
