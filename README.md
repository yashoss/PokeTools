# PokeTools — Pokémon YouTuber & Challenge Runner Toolkit

[![Live Demo](https://img.shields.io/badge/Live_App-GitHub_Pages-16a34a?style=for-the-badge&logo=github)](https://yashoss.github.io/PokeTools/)
[![Support via PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.biz/famousnamegames)
[![License: MIT](https://img.shields.io/badge/License-MIT-2563eb?style=for-the-badge)](./LICENSE)

**Live Tool:** **[https://yashoss.github.io/PokeTools/](https://yashoss.github.io/PokeTools/)**

**PokeTools** is a fast, zero-backend web toolkit built to help Pokémon YouTubers, streamers, and challenge runners research and plan video challenges across **Generations I–IX (#0001 Bulbasaur – #1025 Pecharunt)**.

---

## Included Tools

### 1. Pokédex Scrambler
Enter any Pokédex number (or search by Pokémon name) to generate every valid Pokémon formed by permuting its digits.
- **4-Digit National Dex Scrambling by Default**: Entering `123` (or `Scyther`) scrambles `0123`, automatically finding `#0123 Scyther`, `#0132 Ditto`, `#0213 Shuckle`, `#0231 Phanpy`, `#0312 Minun`, `#0321 Wailord`, and `#1023 Iron Crown`.
- **Direct Reference Links**: Each Pokémon card displays its official artwork, National Dex number, Generation, Types, Base Stat Total (BST), and a direct link to its full Pokédex entry (**PokémonDB**, **Bulbapedia**, **Serebii**, or **Smogon**).

### 2. Lettermon Builder
Enter a Pokémon's name (with live autosuggest) or type any custom spelling/nickname to view all **Attacks**, **Abilities**, and **Items** starting with each letter in the name.
- **Learnable Pool Toggle**: Restrict attacks and abilities to **only those the selected Pokémon can actually learn/have**, or browse all moves and abilities across Pokémon.
- **Instant Sub-Filtering**: Filter moves, abilities, and items by keyword, type, or effect while jumping between letters using the sticky letter bar.

---

## Global Filters & Settings Panel

Click **Filters** on the right to open the expandable settings drawer, which applies across tools:

- **Basic Filters**:
  - **Generation**: Toggle any combination of `Gen 1` – `Gen 9`.
  - **Exclude Legendaries**: Hide Box Legendaries and Sub-Legendaries.
  - **Exclude Mythicals**: Hide Mythical Pokémon.
  - **Max BST**: Restrict Pokémon by maximum Base Stat Total (`200`–`780`).
  - **Is in Game**: Restrict to Pokémon available in a specific game's Regional Pokédex (`Red/Blue/Yellow` through `Scarlet & Violet` and `Legends: Z-A`), while also capping Lettermon moves, abilities, and items to that game's generation.
- **Advanced Settings** (expandable at the bottom of the panel):
  - **Min BST**: Set a minimum Base Stat Total floor.
  - **Types**: Filter by any of the 18 Pokémon types.
  - **Include Megas & Regional Forms**: Include Alolan, Galarian, Hisuian, Paldean, Mega, and Primal forms.
  - **Allow Transfer-Only Pokémon in Game**: Include National Dex / transferable Pokémon for the selected game.
  - **Scrambler Digit Format**: Choose between `4-Digit Padded (0123)`, `3-Digit Padded (025)`, or `Exact Digits`.
  - **Pokémon Info Link Site**: Switch external links between `PokémonDB`, `Bulbapedia`, `Serebii`, and `Smogon`.

---

## Support the Creator

If PokeTools helps you plan or record your Pokémon videos or challenges, you can support ongoing development here:

- **PayPal**: [paypal.biz/famousnamegames](https://www.paypal.biz/famousnamegames)

---

## Running Locally

No build step or external API keys are required—all Pokémon, move, ability, item, and learnset data is bundled locally for instant 0ms lookups.

```bash
# Clone the repository
git clone https://github.com/yashoss/PokeTools.git
cd PokeTools

# Start a local static server on http://localhost:8080
npm start
```

---

## License

Released under the [MIT License](./LICENSE). Pokémon and all respective names are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc.
