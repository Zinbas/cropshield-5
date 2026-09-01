import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES, translate } from "./i18n";

describe("CropShield language catalog", () => {
  it("supports the requested five languages", () => {
    expect(SUPPORTED_LANGUAGES.map((language) => language.code)).toEqual(["en", "hi", "mr", "as", "bn"]);
  });

  it("translates primary navigation labels with English fallback", () => {
    expect(translate("hi", "scan")).toBe("स्कैन");
    expect(translate("mr", "cases")).toBe("प्रकरणे");
    expect(translate("as", "profile")).toBe("প্ৰফাইল");
    expect(translate("bn", "experts")).toBe("বিশেষজ্ঞ");
    expect(translate("en", "unknown-key")).toBe("unknown-key");
  });
});
