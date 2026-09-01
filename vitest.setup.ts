// Tests run without deployment secrets; production code still fails closed when JWT_SECRET is absent.
process.env.JWT_SECRET ??= "cropshield-test-only-secret-do-not-use-in-production";
process.env.NODE_ENV ??= "test";

export {};
