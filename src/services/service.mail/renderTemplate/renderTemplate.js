import fs from "fs";
import path from "path";

export const renderTemplate = (templateName, variables) => {

  const filePath = path.join(
    process.cwd(),
    "src/services/service.mail/templates",
    templateName
  );

  let template = fs.readFileSync(filePath, "utf8");

  Object.keys(variables).forEach((key) => {
    template = template.replace(
      new RegExp(`{{${key}}}`, "g"),
      variables[key]
    );
  });

  return template;
};