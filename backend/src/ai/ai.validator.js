
const { z } = require("zod");

const NodeSchema = z.object({
  id: z.string().trim().min(1, "Node ID cannot be empty"),

  type: z.string().trim().min(1, "Node type is required"),

  shape: z.enum([
    "circle",
    "rectangle",
    "diamond",
    "terminator"
  ]),

  label: z.string().trim().min(1, "Node label cannot be empty")
}).strict();

const EdgeSchema = z.object({
  source: z.string().trim().min(1, "Edge source is required"),

  target: z.string().trim().min(1, "Edge target is required"),

  label: z.string()
}).strict();

const DiagramSchema = z.object({
  nodes: z.array(NodeSchema)
    .min(1, "Diagram must contain at least one node")
    .max(50, "Diagram cannot contain more than 50 nodes"),

  edges: z.array(EdgeSchema)
    .max(100, "Diagram cannot contain more than 100 edges")
}).strict();

function validateAIResponse(response) {
  const result = DiagramSchema.safeParse(response);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    };
  }

  const { nodes, edges } = result.data;
  const errors = [];

  // Ensure every node ID is unique.
  const nodeIds = new Set();

  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        path: "nodes",
        message: `Duplicate node ID: ${node.id}`
      });
    }

    nodeIds.add(node.id);
  }

  // Ensure every edge references existing nodes.
  for (const [index, edge] of edges.entries()) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        path: `edges.${index}.source`,
        message: `Unknown source node ID: ${edge.source}`
      });
    }

    if (!nodeIds.has(edge.target)) {
      errors.push({
        path: `edges.${index}.target`,
        message: `Unknown target node ID: ${edge.target}`
      });
    }

    if (edge.source === edge.target) {
      errors.push({
        path: `edges.${index}`,
        message: "Self-referencing edges are not allowed"
      });
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    data: result.data
  };
}

module.exports = {
  DiagramSchema,
  validateAIResponse
};
