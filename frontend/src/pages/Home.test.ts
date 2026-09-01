import { describe, expect, it } from "vitest";
import { getExpertContactHref, getScanNextSteps, getSection, getUserInitials, LOCAL_SIGNUP_ROLES, validateCropImage } from "./Home";

describe("CropShield workspace section routing", () => {
  it("recognizes scan as a primary action route even though it is not persistent navigation", () => {
    expect(getSection("/farmer/scan")).toBe("scan");
  });

  it("recognizes farmer workspace sections", () => {
    expect(getSection("/farmer/dashboard")).toBe("dashboard");
    expect(getSection("/farmer/crops")).toBe("crops");
    expect(getSection("/farmer/scans")).toBe("scans");
    expect(getSection("/farmer/cases")).toBe("cases");
    expect(getSection("/farmer/experts")).toBe("experts");
    expect(getSection("/farmer/stores")).toBe("stores");
    expect(getSection("/farmer/profile")).toBe("profile");
  });

  it("falls back to the dashboard for unknown paths", () => {
    expect(getSection("/farmer/unknown")).toBe("dashboard");
  });

  it("exposes the configured-owner administrator signup role", () => {
    expect(LOCAL_SIGNUP_ROLES).toContainEqual({
      value: "admin",
      label: "Administrator (configured owner only)",
    });
  });

  it("creates readable initials from the signed-in user name", () => {
    expect(getUserInitials("Meera Nair")).toBe("MN");
    expect(getUserInitials("  Ravi  ")).toBe("R");
    expect(getUserInitials()).toBe("U");
  });

  it("gives high-risk scans practical next steps", () => {
    expect(getScanNextSteps("high", "Leaf blight")).toEqual(expect.arrayContaining([
      expect.stringContaining("Leaf blight"),
      expect.stringContaining("verified agricultural expert"),
    ]));
  });

  it("validates camera and gallery image constraints", () => {
    expect(validateCropImage({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateCropImage({ type: "image/gif", size: 1024 })).toContain("JPEG");
    expect(validateCropImage({ type: "image/png", size: 13 * 1024 * 1024 })).toContain("12 MB");
  });

  it("builds safe contact actions for verified experts", () => {
    const expert = { phone: "+91 (98765) 43210", email: "expert@example.com" };
    expect(getExpertContactHref(expert, "call")).toBe("tel:+919876543210");
    expect(getExpertContactHref(expert, "message")).toBe("sms:+919876543210");
    expect(getExpertContactHref({ email: "expert@example.com" }, "message")).toBe("mailto:expert@example.com");
  });
});
