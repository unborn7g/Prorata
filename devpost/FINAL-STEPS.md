# Prorata — final publish + submit runbook (NextSpark Hacks)

Deadline: Tue 27 Oct 2026, 04:00 AM WAT. Everything below is already built and tested; these are the only remaining human steps.

Files on your PC after `git pull`:

- Video: `hackathon\prorata-media\prorata-demo-1080p.mp4` (1m 46s, 1920x1080, natural 1.0x voice)
- Thumbnail: `hackathon\prorata-media\prorata-thumbnail-1200x800.png`
- Screenshots: `hackathon\prorata-media\01..07-*.png`
- Captions: `hackathon\prorata-media\prorata-captions.srt`
- App code: `hackathon\prorata`

---

## Step 1 — push the finished code to the public repo

```powershell
cd C:\Users\UNBORN\solus-work
git pull origin arena/5a7dbace-zcanary
./publish-prorata.ps1
```

## Step 2 — upload the video to YouTube

1. Go to https://studio.youtube.com → Create → Upload videos
2. Choose `C:\Users\UNBORN\solus-work\hackathon\prorata-media\prorata-demo-1080p.mp4`
3. Title:

```
Prorata — split a shared prepaid electricity meter fairly (NextSpark Hacks)
```

4. Description:

```
Prorata splits a shared prepaid electricity meter top-up fairly between flatmates, tenants and hostels — by equal share, by days present, or by days present times appliance weight — and guarantees the shares add up to the exact amount paid.

In this demo: four flatmates share a $500 (280 kWh) top-up over 30 days. Tobi was away for half the month so he pays $71 instead of $125, and Chidi runs the air conditioner so his 1.5x weight takes him to $187. Every share is whole-number largest-remainder maths, so nothing is lost to rounding, and the app writes the group-chat message for you.

Built with Next.js 15, React 19 and TypeScript. 10 of 10 unit tests pass (npm test). No API keys, no meter connection, no payment integration.

Code: https://github.com/unborn7g/Prorata
Built for NextSpark Hacks.
```

5. Audience: No, it is not made for kids
6. Upload the thumbnail `prorata-thumbnail-1200x800.png`, add the captions file `prorata-captions.srt`
7. Visibility: **Unlisted** is fine (judges only need the link)
8. Copy the `https://youtu.be/...` link

## Step 3 — optional live demo (Vercel, free)

```powershell
cd C:\Users\UNBORN\solus-work\hackathon\prorata
npx vercel --prod
```

Project name: `prorata`. Copy the `https://prorata-....vercel.app` link. (Skippable — a live link is optional in the rules.)

## Step 4 — Devpost submission

Open https://nextspark-hacks.devpost.com/ → Submit project, then fill it with the exact strings below.

- Project name:

```
Prorata
```

- Elevator pitch / tagline:

```
Split a shared prepaid electricity meter fairly — by equal share, days present, or days x appliance weight — and always exactly to the last cent.
```

- Built with (tags):

```
next.js, react, typescript, tailwindcss, node.js
```

- "Try it out" links: Repo `https://github.com/unborn7g/Prorata`, Video (your YouTube link), Live demo (your Vercel link if you did step 3)
- Video demo link: your YouTube link from step 2
- Image gallery: upload `01-workbench-dark.png`, `02-days-present.png`, `03-days-and-weight.png`, `04-equal-split.png`, `05-who-owes-and-message.png`, `06-light-theme.png`, `07-exact-check.png`
- Thumbnail: `prorata-thumbnail-1200x800.png`

The long description, inspiration, challenges, what I learned, what's incomplete, and the AI/tools credit are all written out in `hackathon/prorata/devpost/submission.md` — copy the matching sections straight into the Devpost fields.

## Step 5 — final check before you press Submit

- Repo is public and opens in a private window
- Video plays without requesting access
- At least one screenshot attached
- "What's next / incomplete" section is present (judges asked for planned work to be marked)
- AI assistance credited
