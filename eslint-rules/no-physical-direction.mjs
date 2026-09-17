/**
 * Bans physical-direction Tailwind/CSS classes (left-/right-/ml-/mr-/pl-/pr-
 * and any `-left`/`-right` suffix, e.g. `text-left`, `float-right`) in favour
 * of logical properties (start-/end-/ms-/me-/ps-/pe-). The matrix's RTL
 * fidelity (PRD §6, SPEC §8) depends on every direction being logical, since
 * `dir="rtl"` is what mirrors the layout — a physical class hard-codes one
 * direction and breaks the mirror silently.
 */

const PHYSICAL_MARGIN_PADDING = /^(ml|mr|pl|pr)-/;
const PHYSICAL_LEFT_RIGHT = /(^|-)(left|right)($|-)/;

function isBannedToken(token) {
  const base = token.includes(":") ? token.slice(token.lastIndexOf(":") + 1) : token;
  return PHYSICAL_MARGIN_PADDING.test(base) || PHYSICAL_LEFT_RIGHT.test(base);
}

function findBannedToken(value) {
  if (typeof value !== "string") return null;
  for (const token of value.split(/\s+/)) {
    if (token && isBannedToken(token)) return token;
  }
  return null;
}

const CLASS_HELPER_NAMES = new Set(["cn", "clsx", "twMerge", "cva"]);

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "disallow physical-direction CSS classes; use logical properties for RTL/LTR fidelity",
    },
    schema: [],
    messages: {
      physicalDirection:
        'Physical-direction class "{{token}}" is banned. Use the logical equivalent (ms-/me-/ps-/pe-/start-/end-) so the matrix mirrors correctly in RTL.',
    },
  },
  create(context) {
    function report(node, token) {
      context.report({ node, messageId: "physicalDirection", data: { token } });
    }

    function checkStringNode(node, rawValue) {
      const token = findBannedToken(rawValue);
      if (token) report(node, token);
    }

    function walkExpression(expr) {
      if (!expr) return;
      switch (expr.type) {
        case "Literal":
          if (typeof expr.value === "string") checkStringNode(expr, expr.value);
          break;
        case "TemplateLiteral":
          for (const quasi of expr.quasis) checkStringNode(quasi, quasi.value.raw);
          break;
        case "ConditionalExpression":
          walkExpression(expr.consequent);
          walkExpression(expr.alternate);
          break;
        case "LogicalExpression":
          walkExpression(expr.left);
          walkExpression(expr.right);
          break;
        case "CallExpression":
          if (
            expr.callee.type === "Identifier" &&
            CLASS_HELPER_NAMES.has(expr.callee.name)
          ) {
            for (const arg of expr.arguments) walkExpression(arg);
          }
          break;
        default:
          break;
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (node.name.name !== "className" && node.name.name !== "class") return;
        const value = node.value;
        if (!value) return;
        if (value.type === "Literal" && typeof value.value === "string") {
          checkStringNode(value, value.value);
        } else if (value.type === "JSXExpressionContainer") {
          walkExpression(value.expression);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          CLASS_HELPER_NAMES.has(node.callee.name)
        ) {
          for (const arg of node.arguments) walkExpression(arg);
        }
      },
    };
  },
};

export default rule;
