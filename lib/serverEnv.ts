type Environment = Record<string, string | undefined>;

function requiredValue(environment: Environment, name: string) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured on the server`);
  }

  return value;
}

export function getMongoUri(environment: Environment = process.env) {
  const uri = requiredValue(environment, "MONGODB_URI");

  if (!/^mongodb(?:\+srv)?:\/\/\S+$/.test(uri)) {
    throw new Error("MONGODB_URI must be a valid MongoDB connection string");
  }

  return uri;
}

export function getDemoMode(environment: Environment = process.env) {
  const value = environment.DEMO_MODE;

  if (value === undefined) {
    return false;
  }

  if (value !== "true" && value !== "false") {
    throw new Error("DEMO_MODE must be exactly true or false");
  }

  return value === "true";
}
