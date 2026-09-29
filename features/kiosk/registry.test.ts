import { MENU_ITEMS, SCENES } from "./registry";

describe("MENU_ITEMS", () => {
  it("lists every carousel scene exactly once", () => {
    const menuIds = MENU_ITEMS.map((item) => item.sceneId).sort();
    const sceneIds = SCENES.map((scene) => scene.id).sort();

    expect(menuIds).toEqual(sceneIds);
  });
});
