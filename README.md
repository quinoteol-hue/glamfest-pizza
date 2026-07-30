# Glamfest Pizza Ordering

Standalone, mobile-first pizza ordering app for Glamfest.

## Features

- Three preset pizzas: Resus, Paeds and Triage
- Build-your-own pizza with up to 4 toppings
- Garlic oil or chilli oil
- Ingredient icons displayed during selection and order review
- One unique collection slot every 2 minutes from 12:00 to 14:30
- Maximum global limit of 80 pizzas
- Duplicate-slot protection
- Customer confirmation screen
- QR code generated from the final deployed website URL
- PIN-protected admin board; default PIN: `2222`
- Admin statuses: Pending, Preparing, Ready, Collected and Cancelled
- Persistent JSON storage when deployed with a Render disk

## Capacity note

From 12:00 through 14:30 inclusive, one pizza every 2 minutes provides 76 unique collection slots. The app also retains the requested global safety cap of 80 pizzas.

## Run locally

```bash
npm start
```

Customer page: `http://localhost:3000`

Admin page: `http://localhost:3000/admin`

## Deploy on Render

Use the included `render.yaml` Blueprint. Set `PUBLIC_URL` to the final Render address so the QR code points to the live ordering page.
