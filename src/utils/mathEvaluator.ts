/**
 * Evaluates whether a user's input expression or equation is mathematically equivalent
 * to the correct answer key. Supports raw numbers, decimals, fractions, algebraic
 * expressions, and equations.
 */
export function evaluateMathEquivalence(userStr: string, correctStr: string, tolerance?: number): boolean {
  const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase().trim();
  const u = clean(userStr);
  const c = clean(correctStr);
  if (!u || !c) return false;
  if (u === c) return true;

  const tol = typeof tolerance === 'number' && tolerance >= 0 ? tolerance : 1e-5;

  // Helper to convert fraction/decimal to number
  const parseNum = (s: string): number | null => {
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const fracMatch = s.match(/^(-?\d+)\/(\d+)$/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1], 10);
      const den = parseInt(fracMatch[2], 10);
      return den !== 0 ? num / den : null;
    }
    return null;
  };

  const uNum = parseNum(u);
  const cNum = parseNum(c);
  if (uNum !== null && cNum !== null) {
    return Math.abs(uNum - cNum) <= tol;
  }

  // Safe expression evaluator replacing variables x, y, z, Greek letters, and functions
  const evalExpr = (expr: string, vars: Record<string, number>): number => {
    let formatted = expr
      .replace(/π/g, 'Math.PI')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/\^/g, '**');

    // Replace implicit multiplication (e.g. 2x -> 2*x, 2Math -> 2*Math)
    formatted = formatted
      .replace(/(\d+)([a-zA-Z\u03b1-\u03c9])/g, '$1*$2')
      .replace(/([a-zA-Z\u03b1-\u03c9])(\d+)/g, '$1*$2');
    
    // Map Greek letters to test variables
    const extendedVars = {
      ...vars,
      'α': vars.x || 1.1,
      'β': vars.y || 2.2,
      'γ': vars.z || 3.3,
      'θ': vars.x || 4.4,
    };

    // Replace variables with parenthesis-enclosed values
    for (const [v, val] of Object.entries(extendedVars)) {
      formatted = formatted.replace(new RegExp(v, 'g'), `(${val})`);
    }

    // Replace Math constants/functions
    formatted = formatted
      .replace(/Math\.PI/g, `(${Math.PI})`)
      .replace(/Math\.sqrt/g, 'Math.sqrt');

    // Safe characters check (digits, operators, decimals, parentheses, and Math.sqrt)
    let testSanity = formatted.replace(/Math\.sqrt/g, '');
    if (/^[0-9+\-*/().\s*]+$/.test(testSanity)) {
      try {
        return Function(`"use strict"; return (${formatted})`)();
      } catch {
        return NaN;
      }
    }
    return NaN;
  };

  // Equation support: check if both are equations (contain '=')
  if (u.includes('=') && c.includes('=')) {
    const [uLeft, uRight] = u.split('=');
    const [cLeft, cRight] = c.split('=');
    
    // Simple symmetric swap check (e.g. x=3 and 3=x)
    if ((uLeft === cLeft && uRight === cRight) || (uLeft === cRight && uRight === cLeft)) {
      return true;
    }

    // Evaluate differences (Left - Right) across random test points to prove equivalence
    const testPoints = [
      { x: 1, y: 3, z: 5 },
      { x: 2, y: 5, z: 9 },
      { x: -1, y: -1, z: 1 },
      { x: 5, y: 11, z: 17 }
    ];

    let allMatch = true;
    let validPointsCount = 0;
    for (const pt of testPoints) {
      const cValL = evalExpr(cLeft, pt);
      const cValR = evalExpr(cRight, pt);
      const uValL = evalExpr(uLeft, pt);
      const uValR = evalExpr(uRight, pt);

      if (isNaN(cValL) || isNaN(cValR) || isNaN(uValL) || isNaN(uValR)) {
        allMatch = false;
        break;
      }

      validPointsCount++;
      const cDiff = cValL - cValR;
      const uDiff = uValL - uValR;
      
      // Equations are equivalent if their difference equals zero at the same points,
      // or if they are proportional (e.g. 2x=4 vs x=2).
      if (Math.abs(cDiff) < 1e-5 && Math.abs(uDiff) < 1e-5) {
        continue;
      }
      
      // Proportional diff check
      if (Math.abs(cDiff) > 1e-5 && Math.abs(uDiff) > 1e-5) {
        const ratio1 = cDiff / uDiff;
        // Test with a perturbed point to ensure it's a constant ratio
        const perturbedPt = { x: pt.x + 3, y: pt.y + 7, z: pt.z + 11 };
        const cValL2 = evalExpr(cLeft, perturbedPt);
        const cValR2 = evalExpr(cRight, perturbedPt);
        const uValL2 = evalExpr(uLeft, perturbedPt);
        const uValR2 = evalExpr(uRight, perturbedPt);
        const cDiff2 = cValL2 - cValR2;
        const uDiff2 = uValL2 - uValR2;
        
        if (Math.abs(cDiff2) < 1e-5 || Math.abs(uDiff2) < 1e-5) {
          allMatch = false;
          break;
        }
        const ratio2 = cDiff2 / uDiff2;
        if (Math.abs(ratio1 - ratio2) > 1e-5) {
          allMatch = false;
          break;
        }
      } else {
        allMatch = false;
        break;
      }
    }
    if (allMatch && validPointsCount > 0) return true;
  }

  // Algebraic expressions: (no '=' but contains variables like x, y, z)
  if (/[a-zA-Z]/.test(c) && !u.includes('=') && !c.includes('=')) {
    const testPoints = [
      { x: 1, y: 3, z: 5 },
      { x: 2, y: 5, z: 9 },
      { x: -1, y: -1, z: 1 }
    ];

    let allMatch = true;
    let validPointsCount = 0;
    for (const pt of testPoints) {
      const cVal = evalExpr(c, pt);
      const uVal = evalExpr(u, pt);
      if (isNaN(cVal) || isNaN(uVal)) {
        allMatch = false;
        break;
      }
      validPointsCount++;
      if (Math.abs(cVal - uVal) > 1e-5) {
        allMatch = false;
        break;
      }
    }
    if (allMatch && validPointsCount > 0) return true;
  }

  return false;
}

/**
 * Evaluates whether a user's input answer matches the primary correct answer OR
 * any of the configured alternative answers / acceptable aliases.
 */
export function evaluateNumericAnswer(
  userStr: string,
  correctStr: string,
  alternativeAnswers?: string[],
  tolerance?: number
): boolean {
  if (evaluateMathEquivalence(userStr, correctStr, tolerance)) {
    return true;
  }
  if (alternativeAnswers && Array.isArray(alternativeAnswers)) {
    for (const alt of alternativeAnswers) {
      if (alt && typeof alt === 'string' && alt.trim()) {
        if (evaluateMathEquivalence(userStr, alt.trim(), tolerance)) {
          return true;
        }
      }
    }
  }
  return false;
}
