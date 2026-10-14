
const { z } = require("zod");

const ShapeSchema = z.object({
  type: z.literal("shape.create"),

  shape: z.enum([
    "circle",
    "rectangle",
    "line"
  ]),

  x: z.number().finite(),
  y: z.number().finite(),

  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  radius: z.number().positive().optional()
}).strict();

// 2. Validate the AI response
function validateAIResponse(response) {
  const result = ShapeSchema.safeParse(response);
    console.log("THIS IS RESULT",result)
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues
    };
  }

  return {
    valid: true,
    data: result.data
  };
}

module.exports = { validateAIResponse };
