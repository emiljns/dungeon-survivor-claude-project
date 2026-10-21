import * as Phaser from "phaser";
import { WEAPONS, type WeaponId } from "../data/weapons.ts";
import { villageStock } from "../logic/economy.ts";
import { artMode } from "../rendering/Art.ts";
import { buyUnlock, loadSave, writeSave } from "../systems/SaveStore.ts";
import { browserStorage } from "../systems/HighScoreStore.ts";
import { ShopPanel } from "../ui/ShopPanel.ts";
import { PALETTE } from "./config.ts";

/**
 * The village shop opened from the title menu. Until the Home Village
 * prologue exists (Milestone 11), this is how saved coins are spent between
 * runs. Same panel and rules as the shopkeeper on the village map.
 */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super("shop");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.background);
    new ShopPanel(
      this,
      {
        title: "VILLAGE SHOP",
        greeting: "Weapons, yours to keep. Paid with saved coins.",
        face: "shopkeeperFace",
        currency: "SAVED",
        state: () => {
          const save = loadSave(browserStorage());
          return { coins: save.coins, items: villageStock(save.unlocks) };
        },
        buy: (id) => {
          if (!id.startsWith("weapon:")) return "";
          const weapon = id.slice("weapon:".length) as WeaponId;
          const storage = browserStorage();
          const save = loadSave(storage);
          const result = buyUnlock(save, weapon, WEAPONS[weapon].unlockPrice);
          if (!result.ok) return save.unlocks.includes(weapon) ? "You already own it." : "Not enough saved coins.";
          if (!writeSave(storage, result.save)) return "Could not save: purchase not kept.";
          return `${WEAPONS[weapon].name} unlocked! Buy it from the merchant on a run.`;
        },
        onClose: () => this.scene.start("menu"),
      },
      artMode(this),
    );
  }
}
