import { describe, expect, it } from "vitest";
import type { ChangeEvent } from "react";
import { buildRecommendationProgress, formatFieldContext, formatGpsLabel, getExpertContactHref, getScanNextSteps, getSection, getUserInitials, handlePhotoInputChange, LOCAL_SIGNUP_ROLES, mapGeocodedAddress, parseRecommendationProgress, validateCropImage } from "./Home";

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
      label: "Administrator",
    });
  });

  it("isolates photo selection from form navigation and resets the input", () => {
    let prevented = false;
    let stopped = false;
    let forwarded: File | undefined;
    const input = { files: [new File(["image"], "leaf.jpg", { type: "image/jpeg" })], value: "selected" } as unknown as HTMLInputElement;
    handlePhotoInputChange({ preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; }, currentTarget: input } as ChangeEvent<HTMLInputElement>, (file) => { forwarded = file; });
    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
    expect(forwarded?.name).toBe("leaf.jpg");
    expect(input.value).toBe("");
  });

  it("maps reverse-geocoded GPS components into signup fields", () => {
    expect(mapGeocodedAddress("Nashik, Maharashtra 422001, India", [
      { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
      { long_name: "Nashik", types: ["administrative_area_level_2"] },
      { long_name: "422001", types: ["postal_code"] },
      { long_name: "Nashik", types: ["locality"] },
      { long_name: "Makhmalabad", types: ["sublocality_level_1"] },
    ], { state: "", district: "", pinCode: "", village: "", town: "" })).toMatchObject({ region: "Nashik, Maharashtra 422001, India", state: "Maharashtra", district: "Nashik", pinCode: "422001", village: "Makhmalabad", town: "Nashik" });
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

  it("builds recommendation progress as pending steps", () => {
    expect(buildRecommendationProgress(["Inspect the leaves", "Improve airflow"])).toEqual([
      { step: "Inspect the leaves", completed: false },
      { step: "Improve airflow", completed: false },
    ]);
  });

  it("formats only the field context supplied by the farmer", () => {
    expect(formatFieldContext({ soilType: "Sandy loam", soilPh: 6.4, cropCount: 120, landArea: 2.5, landUnit: "acres" })).toEqual([
      "Soil: Sandy loam",
      "pH 6.4",
      "120 crops/plants",
      "2.5 acres",
    ]);
    expect(formatFieldContext()).toEqual([]);
  });

  it("formats captured GPS coordinates and handles missing location", () => {
    expect(formatGpsLabel(19.9876543, 73.7812349)).toBe("19.987654, 73.781235");
    expect(formatGpsLabel()).toBe("No GPS coordinates captured");
  });

  it("restores only valid persisted recommendation progress entries", () => {
    expect(parseRecommendationProgress(JSON.stringify([{ step: "Inspect the leaves", completed: true }, { step: "", completed: "no" }, null]))).toEqual([{ step: "Inspect the leaves", completed: true }]);
    expect(parseRecommendationProgress("not-json")).toEqual([]);
  });

  it("builds safe contact actions for verified experts", () => {
    const expert = { phone: "+91 (98765) 43210", email: "expert@example.com" };
    expect(getExpertContactHref(expert, "call")).toBe("tel:+919876543210");
    expect(getExpertContactHref(expert, "message")).toBe("sms:+919876543210");
    expect(getExpertContactHref({ email: "expert@example.com" }, "message")).toBe("mailto:expert@example.com");
  });
});
