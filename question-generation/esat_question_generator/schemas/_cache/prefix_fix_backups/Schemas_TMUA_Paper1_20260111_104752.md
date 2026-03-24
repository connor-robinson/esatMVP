# TMUA Paper 1 Schemas (Mathematical Knowledge)

```markdown
## **M_cd1c9097. Deduction by Cases with Sub-Reasoning**

**Core move:** Examine all possible cases exhaustively; within each case, apply further reasoning to reach a conclusion.

**Seen in / context:**
- Questions involving absolute values or piecewise functions.
- Problems where the solution strategy depends on the value of a variable (positive, negative, zero).
- Situations requiring consideration of different geometric configurations.

**Possible wrong paths:**
- Failing to consider all possible cases.
- Making an incorrect deduction within a specific case.
- Assuming a specific case is the only possibility.

**Notes for generation:**
- Ensure the cases are mutually exclusive and collectively exhaustive.
- Require multiple steps of reasoning within at least one of the cases.
- The sub-reasoning should involve a different mathematical concept or skill.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q4`: The question requires considering cases based on the value of x, and then applying algebraic manipulation within each case to determine the solution set.

---
```

---

```markdown
## **M_03126589. Deductive Elimination of Possibilities**

**Core move:** The argument eliminates possibilities based on stated constraints or conditions, narrowing down the options until a single or limited set of solutions remains.

**Seen in / context:**
- Problems involving inequalities or constraints on variables.
- Situations where a limited set of discrete options exist.
- Logical puzzles requiring deduction.

**Possible wrong paths:**
- Overlooking a constraint or condition.
- Making an invalid assumption about the possible values.
- Failing to consider all possible cases.

**Notes for generation:**
- Ensure a clear set of constraints is provided.
- The problem should require the solver to systematically eliminate options.
- The correct answer should be uniquely determined by the constraints.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q2`: The question provides inequalities that constrain the possible integer values of x and y. By considering the constraints, one can eliminate options until only the correct one remains.

---
```

---

```markdown
## **M_36aef659. Mathematical Induction with Base Case**

**Core move:** Establish a base case and then prove that if the statement holds for n, it also holds for n+1, thus proving it for all n greater than or equal to the base case.

**Seen in / context:**
- Proving a statement is true for all integers greater than or equal to a base case.
- Problems involving sequences or series defined recursively.
- Questions requiring a rigorous proof of a general statement.

**Possible wrong paths:**
- Forgetting to establish the base case.
- Incorrectly assuming the statement is true for n+1 in the inductive step.
- Failing to show that the inductive step covers all possible cases.

**Notes for generation:**
- Ensure the base case is clearly defined and necessary.
- The inductive step should explicitly use the assumption that the statement holds for n.
- The statement being proved can involve divisibility, inequalities, or other mathematical properties.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q5`: This question requires proving a statement about divisibility using mathematical induction, starting with a base case and then showing the inductive step.
---
```

---

```markdown
## **M_6996cc3c. Deduction via Necessary Condition Elimination**

**Core move:** If a condition is necessary for a conclusion, and that condition is false, then the conclusion must also be false.

**Seen in / context:**
- Problems where a statement must be true for a conclusion to hold.
- Questions involving "must be true" or "cannot be true" inferences.
- Logical deductions based on necessary but not sufficient conditions.

**Possible wrong paths:**
- Assuming a necessary condition is also sufficient.
- Confusing necessary and sufficient conditions.
- Failing to recognize that the falsity of a necessary condition invalidates the conclusion.

**Notes for generation:**
- Create questions where a statement is presented as necessary for a conclusion.
- Include answer choices that hinge on understanding necessary vs. sufficient conditions.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2017_Q3`: The question requires recognizing that if a certain condition is necessary for a conclusion, and that condition is false, then the conclusion cannot be true.

---
```

---

```markdown
## **R_c4c24492. Elimination by Contradiction**

**Core move:** Assume the opposite of what you want to prove, and show that this assumption leads to a contradiction.

**Seen in / context:**
- Problems involving proving a statement is true.
- Situations where direct proof is difficult or impossible.
- Logical deductions leading to a contradiction (e.g., a =/= a).

**Possible wrong paths:**
- Failing to identify a clear contradiction.
- Incorrectly assuming the opposite of the statement to be proven.
- Making logical errors in the deduction process.

**Notes for generation:**
- Ensure the contradiction is clear and unambiguous.
- The assumption should directly oppose the statement to be proven.
- The contradiction should arise from valid logical steps.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q1`: Assuming the statement is false leads to a contradiction in the given equation, proving the original statement must be true.
- `TMUA_Paper1_2017_Q10`: Assuming the opposite of the desired inequality and manipulating it algebraically leads to a contradiction, thus proving the original inequality.
- `TMUA_Paper1_2017_Q17`: Assuming a different value for x than the one that satisfies the equation and showing this leads to a contradiction.

---
```

---

```markdown
## **M_9f3335cf. Deductive Elimination of Possibilities**

**Core move:** Systematically eliminate options based on given constraints until only the correct answer remains.

**Seen in / context:**
- Questions with multiple constraints that limit the possible solutions.
- Problems where testing each option is inefficient or impossible.
- Logical reasoning problems with a finite set of potential answers.

**Possible wrong paths:**
- Failing to consider all constraints when eliminating options.
- Making assumptions not explicitly stated in the problem.
- Prematurely selecting an answer without eliminating all other possibilities.

**Notes for generation:**
- Ensure the constraints are sufficient to eliminate all but one option.
- Design questions with multiple plausible but incorrect answers.
- The constraints should be mathematical in nature.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q6`: The question provides constraints on the values of variables, and the solution involves eliminating options that violate these constraints until only one option satisfies all conditions.

---
```

---

```markdown
## **M_fe4866ca. Deductive Elimination of Possibilities**

**Core move:** Eliminate options by demonstrating they contradict known facts or established constraints.

**Seen in / context:**
- Multiple-choice questions where some options can be ruled out definitively.
- Problems involving constraints that limit the possible solutions.
- Situations where a statement can be proven false, thereby eliminating a possibility.
- Logical deductions based on given premises to narrow down choices.

**Possible wrong paths:**
- Assuming an option is correct without rigorous justification.
- Overlooking a constraint that invalidates a potential solution.
- Making logical errors in the deduction process.
- Failing to consider all possible cases or scenarios.

**Notes for generation:**
- Design questions with multiple-choice answers where some options are demonstrably false.
- Include constraints that can be used to eliminate incorrect answers.
- Ensure the correct answer requires a logical deduction, not just a guess.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q7`: Some options can be eliminated because they violate the condition that the sum of the digits is odd.
---
```

---

```markdown
## **M_594fc19b. Elimination by Contradiction with Constraints**

**Core move:** Assume the statement is false, then show that this assumption violates the given constraints, thus proving the original statement must be true.

**Seen in / context:**
- Problems where direct proof is difficult due to complex constraints.
- Situations where disproving the opposite is more straightforward.
- Questions involving inequalities or bounds where a contradiction can be easily derived.

**Possible wrong paths:**
- Attempting a direct proof without considering the constraints.
- Making incorrect assumptions about the implications of the constraints.
- Failing to identify the key constraint that leads to a contradiction.

**Notes for generation:**
- Design questions where direct proof is cumbersome.
- Include constraints that are not immediately obvious but crucial for the contradiction.
- Ensure the false assumption leads to a clear and demonstrable violation of the constraints.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q9`: Assuming the opposite of what needs to be proved allows us to derive a contradiction with the given constraints on the variables.

---
```

---

```markdown
## **M_f3303229. Using Constraints to Deduce Values**

**Core move:** Identify constraints or limitations on possible values and use them to narrow down or uniquely determine the correct value or solution.

**Seen in / context:**
- Problems where the range of possible values is limited (e.g., integers, specific intervals).
- Situations where additional conditions or equations restrict the solution set.
- Problems involving divisibility, remainders, or other number theory concepts.

**Possible wrong paths:**
- Ignoring constraints and considering all possible values, leading to incorrect solutions.
- Making assumptions that are not supported by the given constraints.
- Focusing on finding a general solution instead of using constraints to find a specific solution.

**Notes for generation:**
- Ensure the constraints are sufficient to narrow down the solution to a unique value or a small set of possibilities.
- Constraints can be explicit (e.g., "x must be an integer") or implicit (e.g., derived from equations or inequalities).
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q8`: The question provides constraints on the values of *a* and *b* based on the properties of quadratic equations and their roots. By considering these constraints, one can deduce the possible values of *a* and *b* and find the correct answer.
- `TMUA_Paper1_2017_Q1`: This question requires understanding the constraints imposed by the definition of the function and the given equation to find the possible values of the variable.
- `TMUA_Paper1_2017_Q12`: The problem limits the possible values of *x* to integers and then uses this constraint, along with the given inequality, to determine the range of possible integer solutions.

---
```

---

```markdown
## **M_cca592d7. Proportional Reasoning with Variable Substitution**

**Core move:** Establish a proportional relationship between variables, then use substitution or manipulation to solve for a desired value or relationship.

**Seen in / context:**
- Problems involving ratios and proportions.
- Scenarios where one variable is directly or inversely proportional to another.
- Questions requiring the determination of a constant of proportionality.
- Problems involving unit conversions.

**Possible wrong paths:**
- Incorrectly setting up the proportional relationship (e.g., inverting the ratio).
- Failing to account for inverse proportionality when applicable.
- Making algebraic errors during substitution or manipulation.
- Forgetting to include units in the final answer or using incorrect units.

**Notes for generation:**
- Ensure the proportional relationship is clearly defined.
- Vary the complexity of the algebraic manipulation required.
- Consider including scenarios with inverse proportionality.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q10`: The question involves a proportional relationship between the amount of paint and the area it covers. Solving requires understanding this proportionality and using it to find the area covered by a different amount of paint.
- `TMUA_Paper1_2017_Q1`: This question requires proportional reasoning to determine the number of students studying both subjects based on the given ratios.
- `TMUA_Paper1_2017_Q13`: This question involves understanding inverse proportionality between the number of workers and the time taken to complete a task.

---
```

---

```markdown
## **M_e01bd003. Proportionality and Scaling with Square Roots**

**Core move:** Recognize and apply the relationship between proportionality, scaling factors, and square roots to solve for an unknown value.

**Seen in / context:**
- Problems involving areas or volumes that scale proportionally.
- Situations where a quantity is proportional to the square or square root of another.
- Determining how a change in one variable affects another when related by a square root.

**Possible wrong paths:**
- Forgetting to square or take the square root of the scaling factor.
- Incorrectly assuming a linear relationship when a square root relationship exists.
- Applying the scaling factor to the wrong variable.

**Notes for generation:**
- Ensure the proportional relationship is clearly stated or implied.
- Use geometric contexts (areas, volumes) to naturally introduce square roots.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q11`: Recognising that the radius scales with the square root of the area.

---
```

---

```markdown
## **M_1822fea1. Mathematical Induction with Base Case**

**Core move:** Proves a statement for a base case and then shows that if the statement holds for some arbitrary case, it must also hold for the next case, thus proving it for all cases beyond the base case.

**Seen in / context:**
- Questions requiring proof of a statement for all integers greater than or equal to a base case.
- Problems involving sequences or series defined recursively.
- Situations where a direct proof is difficult but an inductive step is manageable.

**Possible wrong paths:**
- Failing to establish the base case.
- Incorrectly assuming the statement holds for the arbitrary case.
- Making algebraic errors in the inductive step.
- Concluding the statement holds for all cases without proving the inductive step.

**Notes for generation:**
- The statement to be proven should involve integers.
- The inductive step should be non-trivial and require algebraic manipulation.
- Ensure the base case is clearly defined and easily verifiable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q13`: This question requires proving a statement about a sequence using mathematical induction, including establishing a base case and showing the inductive step.
---
```

---

```markdown
## **M_8b45385d. Mathematical Induction with Base Case**

**Core move:** Establish a base case and then assume the statement holds for n=k to prove it holds for n=k+1, thereby proving the statement for all n greater than or equal to the base case.

**Seen in / context:**
- Proving a statement is true for all integers greater than or equal to a base case.
- Questions involving sequences or series defined recursively.
- Problems where a direct proof is difficult or impossible.

**Possible wrong paths:**
- Failing to establish a valid base case.
- Incorrectly assuming the statement holds for n=k.
- Making algebraic errors when proving the statement for n=k+1.

**Notes for generation:**
- Focus on algebraic manipulation within the inductive step.
- Ensure the base case is non-trivial.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q14`: This question requires the student to prove a statement about divisibility using mathematical induction. The base case is established, and then the inductive step proves the statement for n=k+1 assuming it holds for n=k.

---
```

---

```markdown
## **M_2b2ba04d. Deductive Elimination of Possibilities**

**Core move:** The solution is found by systematically eliminating possibilities based on given constraints or conditions until only one option remains.

**Seen in / context:**
- Questions involving constraints or conditions that limit the possible solutions.
- Problems where multiple choices can be ruled out based on given information.
- Logical deduction problems requiring narrowing down options.

**Possible wrong paths:**
- Failing to consider all given constraints when eliminating possibilities.
- Making assumptions not supported by the given information.
- Prematurely choosing an answer without eliminating all other options.

**Notes for generation:**
- Ensure that each constraint is necessary for eliminating at least one possibility.
- The correct answer should be the only remaining option after applying all constraints.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q16`: The question provides conditions that allow for the elimination of incorrect options, leaving only one possible solution.

---
```

---

```markdown
## **M_015d0245. Elimination by Contradiction with Cases**

**Core move:** Prove a statement by assuming its negation, then showing that different possible cases, when combined with the negation, each lead to a contradiction.

**Seen in / context:**
- Problems where direct proof is difficult or impossible.
- Situations where the problem naturally breaks down into distinct cases.
- Proofs involving inequalities or existence.

**Possible wrong paths:**
- Failing to consider all possible cases.
- Making an incorrect assumption when negating the original statement.
- Not rigorously showing that each case leads to a genuine contradiction.

**Notes for generation:**
- The contradiction should not be immediately obvious from the initial assumptions.
- Ensure that the cases are mutually exclusive and collectively exhaustive.
- The question should require careful logical deduction.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q17`: The question requires you to prove a statement by assuming its negation and then considering different cases, each leading to a contradiction.

---
```

---

```markdown
## **M_d99b2aa2. Mathematical Induction with Base Case**

**Core move:** Establish a base case and then prove that if the statement holds for some arbitrary case, it also holds for the next case, thus proving it for all cases greater than or equal to the base case.

**Seen in / context:**
- Proving a statement is true for all integers greater than or equal to a base case.
- Problems involving sequences or series where a recursive relationship is defined.
- Situations where direct proof is difficult or impossible.

**Possible wrong paths:**
- Failing to establish a valid base case.
- Incorrectly assuming the statement holds for the arbitrary case.
- Making algebraic errors when proving the inductive step.

**Notes for generation:**
- Ensure the inductive step is non-trivial and requires manipulation.
- The base case should be simple to verify.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2017_Q25`: This question requires using induction to prove a statement about a sequence. The base case is explicitly given, and the inductive step involves algebraic manipulation.
---
```

---

```markdown
## **M_4b204277. Using Counterexamples to Disprove Universal Statements**

**Core move:** Disprove a universal statement by finding a single instance where the statement is false.

**Seen in / context:**
- Statements about the properties of all numbers (e.g., "all prime numbers are odd").
- Claims that a certain condition always implies another.
- Situations where a general rule is proposed.

**Possible wrong paths:**
- Assuming a statement is true because it holds for several examples.
- Trying to prove the statement true instead of looking for a counterexample.
- Failing to check edge cases or extreme values.

**Notes for generation:**
- Focus on mathematical statements that seem plausible but have exceptions.
- Ensure the counterexample is easily verifiable with basic mathematical knowledge.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2017_Q18`: The correct answer is found by identifying a specific case where the given condition holds, but the conclusion does not.
---
```

---

```markdown
## **M_47229aaf. Mathematical Induction with Base Case Omission**

**Core move:** Attempts to prove a statement for all n using mathematical induction, but fails to verify the base case, rendering the inductive step meaningless.

**Seen in / context:**
- Induction questions where the inductive step appears valid algebraically.
- Problems requiring proof that a statement holds for all positive integers.
- Situations where a student focuses solely on algebraic manipulation without checking initial conditions.

**Possible wrong paths:**
- Assuming the statement is true for all n based solely on the inductive step.
- Overlooking the importance of the base case in establishing the truth for all n.
- Incorrectly identifying or calculating the base case.

**Notes for generation:**
- Ensure the inductive step is algebraically correct, but the base case fails.
- Create statements that appear to hold true after algebraic manipulation but are false for small n.
- The base case should be easily checkable with a simple calculation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2017_Q19`: The inductive step is shown, but the base case is not verified, leading to an incorrect conclusion.

---
```

---

```markdown
## **M_b9c8ff9d. Equating Two Different Summation Series**

**Core move:** Equate two different summation or series expressions based on a given relationship or condition, then simplify the resulting equation to find a relationship between variables.

**Seen in / context:**
- Problems involving summation notation.
- Questions requiring algebraic manipulation of series.
- Scenarios where a specific condition links two series.

**Possible wrong paths:**
- Incorrectly applying summation rules.
- Making algebraic errors during simplification.
- Failing to recognize the relationship between the two series.

**Notes for generation:**
- Ensure the relationship between the two series is clearly defined.
- The simplification process should involve multiple algebraic steps.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2018_Q2`: The question requires equating two different summation series based on a given relationship, then simplifying to find the value of a variable.

---
```

---

```markdown
## **M_3bd91f93. Distance Between Geometric Objects**

**Core move:** Calculate the distance between the centers of the two circles, then subtract their radii to find the shortest distance between the circles themselves.

**Seen in / context:**
- Finding the minimum distance between two circles.
- Problems involving tangent circles.
- Problems where the distance between shapes needs to be minimized.

**Possible wrong paths:**
- Forgetting to subtract the radii of both circles.
- Calculating the distance between points on the circumference without considering the shortest path.
- Confusing the shortest distance with the distance between intersection points.

**Notes for generation:**
- Vary the complexity of finding the distance between the centers (e.g., using coordinate geometry).
- Consider cases where the circles intersect or one is contained within the other.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q3`: This question requires finding the shortest distance between two circles by calculating the distance between their centers and subtracting the radii.

---
```

---

```markdown
## **M_7c50c551. Substitution and Discriminant Analysis**

**Core move:** Solve one equation for one variable, substitute into the other equation, and analyze the discriminant of the resulting quadratic to determine the conditions for distinct real solutions.

**Seen in / context:**
- Systems of equations where one equation is linear and the other is quadratic.
- Problems asking for the number of real solutions to a system of equations.
- Determining conditions for tangency between curves.

**Possible wrong paths:**
- Incorrectly solving for a variable in the initial equation.
- Making algebraic errors during substitution or simplification.
- Forgetting to consider the condition for *distinct* real roots (discriminant > 0, not >= 0).

**Notes for generation:**
- Vary the complexity of the equations involved.
- Consider using parameters to create more challenging problems.
- Ensure the resulting quadratic is not easily factorable to necessitate discriminant analysis.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q4`: This question requires solving for one variable in a linear equation, substituting into a quadratic, and then analyzing the discriminant to find the range of values for which there are distinct real solutions.

---
```

---

```markdown
## **M_e6f1797e. Maximize difference by optimizing components**

**Core move:** Maximize the difference between two expressions by strategically assigning values to variables within those expressions to maximize one and minimize the other.

**Seen in / context:**
- Problems involving inequalities where the goal is to find the maximum possible difference.
- Questions where variables have constraints, affecting the range of possible values.
- Optimizing expressions by considering extreme values within given constraints.

**Possible wrong paths:**
- Assuming that maximizing each component individually will maximize the overall difference.
- Overlooking the constraints on variables, leading to invalid solutions.
- Failing to consider the interplay between the two expressions when optimizing.

**Notes for generation:**
- Include constraints on the variables to make the optimization non-trivial.
- Ensure that maximizing one expression and minimizing the other are not independent.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q5`: The question requires maximizing the difference between two expressions by strategically choosing values for x and y within the given constraints.
---
```

---

```markdown
## **M_4dff1c92. Equating Coefficients in Binomial Expansions**

**Core move:** Calculate coefficients from binomial expansions and equate them to solve for an unknown constant.

**Seen in / context:**
- Finding a specific term in a binomial expansion.
- Solving for an unknown variable embedded within a binomial coefficient.
- Problems involving the ratio of coefficients in a binomial expansion.

**Possible wrong paths:**
- Incorrectly applying the binomial theorem formula.
- Making algebraic errors when simplifying or solving equations.
- Forgetting to account for combinatorial factors when equating coefficients.

**Notes for generation:**
- Vary the complexity of the binomial expansion.
- Introduce multiple unknowns that require simultaneous equations.
- Ensure the unknown is embedded within the binomial coefficient.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q7`: The question requires expanding a binomial, equating coefficients, and solving for the unknown constant 'a'.

---
```

---

```markdown
## **M_171aa44d. System of Equations with Infinite Series**

**Core move:** Formulate a system of equations based on given relationships involving infinite geometric series, then solve for the unknown parameters (first term and common ratio) to calculate the desired infinite sum.

**Seen in / context:**
- Problems involving multiple infinite geometric series with related parameters.
- Questions providing relationships between the sums of different geometric series.
- Scenarios where the goal is to find a specific infinite sum after determining the series' parameters.

**Possible wrong paths:**
- Incorrectly applying the formula for the sum to infinity of a geometric series (e.g., |r| >= 1).
- Making algebraic errors when solving the system of equations.
- Failing to recognize the relationship between the different series.

**Notes for generation:**
- Vary the number of series and the relationships between their parameters.
- Ensure the resulting system of equations is solvable.
- The final answer should require calculating a specific infinite sum.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q8`: The question requires setting up two equations based on the sums of two different geometric series, solving for the first term and common ratio, and then calculating another infinite sum.

---
```

---

```markdown
## **M_dff1f24b. Finding Range for Distinct Real Roots**

**Core move:** Relate the number of distinct real roots of a polynomial to the range of values of a parameter by considering the local extrema.

**Seen in / context:**
- Polynomial equations with a parameter.
- Problems asking for the range of a parameter given a condition on the number of real roots.
- Finding stationary points by differentiation.

**Possible wrong paths:**
- Incorrectly determining the number of roots from the sign of the function at the extrema.
- Forgetting to consider repeated roots when counting distinct roots.
- Algebraic errors in differentiation or solving for stationary points.

**Notes for generation:**
- Vary the degree of the polynomial.
- Vary the parameter's position in the polynomial.
- Consider polynomials where the derivative is easily factorisable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q9`: The number of distinct real roots of a cubic depends on the relative positions of the local maximum and minimum.
---
```

---

```markdown
## **M_3d75b00d. Maximizing Absolute Value with Constraints**

**Core move:** To maximize the absolute value of a product, maximize the absolute values of the individual factors while respecting the given constraints.

**Seen in / context:**
- Problems involving maximizing or minimizing expressions with absolute values.
- Situations where the variables are constrained by inequalities or equations.
- Questions asking for the largest or smallest possible value of an expression.

**Possible wrong paths:**
- Ignoring the constraints on the variables.
- Assuming that maximizing individual terms always maximizes the entire expression.
- Not considering negative values when maximizing absolute values.

**Notes for generation:**
- Include constraints on the variables (e.g., inequalities, equations).
- The expression to be maximized should involve absolute values.
- Ensure that maximizing individual factors leads to the global maximum.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q10`: Recognizing that to maximize the absolute value of the product of two factors, one should maximize the absolute value of each factor individually, considering the given constraints.

---
```

---

```markdown
## **M_6f18814e. Relating Derivatives to Normal Lines**

**Core move:** Find the derivative of a function, use the negative reciprocal to find the slope of the normal line, and solve for the x-coordinate of the point of tangency.

**Seen in / context:**
- Problems involving finding the equation of a normal line to a curve.
- Questions requiring the relationship between the derivative and the slope of a tangent line.
- Problems where the x-coordinate of the point of tangency is unknown.

**Possible wrong paths:**
- Failing to take the negative reciprocal when finding the slope of the normal line.
- Incorrectly differentiating the given function.
- Solving for the y-coordinate instead of the x-coordinate.

**Notes for generation:**
- Vary the function type (polynomial, trigonometric, etc.).
- Change the way the normal line is defined (e.g., passes through a specific point).
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2018_Q11`: The question requires finding the x-coordinate where the normal line has a specific gradient, testing the understanding of derivatives and normal lines.
---
```

---

```markdown
## **M_8e762ec2. Area Calculation with Integral Manipulation**

**Core move:** Relate a definite integral to the area under a curve, and manipulate the integral (e.g., splitting it, changing limits) to find the total area enclosed by the curve and the x-axis, accounting for regions below the x-axis.

**Seen in / context:**
- Finding the area between a curve and the x-axis where the curve crosses the x-axis.
- Calculating areas bounded by curves defined by different functions over different intervals.
- Problems requiring splitting an integral into multiple integrals to handle different regions.

**Possible wrong paths:**
- Forgetting to take the absolute value of the integral when the function is negative.
- Incorrectly determining the limits of integration.
- Not recognizing when to split the integral into multiple parts.

**Notes for generation:**
- Questions can involve polynomial, trigonometric, or exponential functions.
- Vary the complexity of the function and the number of regions.
- Consider including functions with known integrals.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q12`: The question requires splitting the integral into two parts and taking the absolute value of the integral over the interval where the function is negative to find the total area.
---
```

---

```markdown
## **M_c2da2daa. Sign Change of Derivative Determines Extrema**

**Core move:** Identify points where the derivative changes sign from negative to positive to locate local minima of the original function.

**Seen in / context:**
- Finding local minima of a function.
- Determining the nature of stationary points.
- Analyzing the behavior of a function based on its derivative.

**Possible wrong paths:**
- Assuming that a zero derivative always indicates an extremum.
- Confusing the sign change for a maximum with the sign change for a minimum.
- Ignoring points where the derivative is undefined.

**Notes for generation:**
- Questions should require students to interpret the sign of the derivative.
- Include functions where the derivative is zero but there is no extremum.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q13`: Correctly identifies the sign change of the derivative as the key to finding the minimum value.
---
```

---

```markdown
## **M_4ac72365. Substitution and Equation Solving**

**Core move:** Substitute given values into an equation and solve for the remaining unknown variable.

**Seen in / context:**
- Solving simultaneous equations by substituting one equation into another.
- Finding the equation of a line or curve by substituting coordinates of points.
- Evaluating a function at a specific point by substituting the input value.

**Possible wrong paths:**
- Incorrectly substituting values, leading to arithmetic errors.
- Misinterpreting the equation and substituting into the wrong variable.
- Not simplifying the equation after substitution, making it harder to solve.

**Notes for generation:**
- The equation can involve various functions (linear, quadratic, trigonometric, etc.).
- The unknown variable can be isolated or require further algebraic manipulation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q14`: Substituting x and y values into the given equation and solving for k.
---
```

---

```markdown
## **M_9b49d852. Substitution and Quadratic Solution**

**Core move:** Transform the equation into a quadratic form through substitution to solve for the variable.

**Seen in / context:**
- Equations involving terms that can be expressed as powers of a common expression.
- Problems where direct algebraic manipulation is difficult without substitution.
- Questions requiring the solution of equations that are quadratic in form.

**Possible wrong paths:**
- Incorrectly applying the substitution, leading to an equation that is not quadratic.
- Forgetting to solve for the original variable after solving for the substituted variable.
- Making algebraic errors when manipulating the equation after substitution.

**Notes for generation:**
- Ensure the substitution leads to a solvable quadratic equation.
- Vary the complexity of the expressions used in the substitution.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q15`: The question requires substituting `y = x^2` to solve a quartic equation as a quadratic in `y`.

---
```

---

```markdown
## **M_4334d460. Optimization via Stationary Point Analysis**

**Core move:** Find the stationary point of a function, express a distance function based on that point, and minimize the distance function with respect to a parameter.

**Seen in / context:**
- Optimization problems where the optimal value depends on a parameter.
- Finding the closest point on a curve or surface to a given point.
- Minimizing a function subject to a constraint by finding stationary points.

**Possible wrong paths:**
- Incorrectly calculating the derivative of the function.
- Failing to consider boundary conditions or endpoints.
- Minimizing the original function directly without considering the distance to the stationary point.

**Notes for generation:**
- The function to be optimized should be relatively simple to differentiate.
- The distance function should involve a parameter that can be varied.
- The stationary point should be expressible in terms of the parameter.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q16`: This question requires finding the minimum distance between a point and a curve, which involves finding the stationary point of a distance function and then minimizing with respect to a parameter.

---
```

---

```markdown
## **M_676ec7b3. Balancing Changes to Maintain Overall Average**

**Core move:** Calculate the total sum of both datasets before and after the exchange to infer the relationship between the exchanged values and then use this to calculate the overall mean.

**Seen in / context:**
- Questions involving exchange of values between two sets.
- Problems where the overall average remains constant despite changes.
- Scenarios where the sum of the values is more important than individual values.

**Possible wrong paths:**
- Assuming the average of each set remains constant.
- Focusing on individual changes without considering the overall sum.
- Incorrectly calculating the change in the total sum.

**Notes for generation:**
- Vary the context (e.g., ages, scores, weights).
- Ensure the relationship between the exchanged values is not immediately obvious.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q17`: Calculate the overall mean by inferring the relationship between the exchanged values based on the constant total sum.

---
```

---

```markdown
## **M_ca07524f. Symmetry via Period and Phase Shift**

**Core move:** Determine the axis of symmetry of a sinusoidal function by considering its period and phase shift.

**Seen in / context:**
- Identifying the line of symmetry for trigonometric functions.
- Relating transformations of trigonometric functions to their graphs.
- Problems involving sinusoidal functions with phase shifts.

**Possible wrong paths:**
- Incorrectly applying the phase shift, leading to a wrong axis of symmetry.
- Neglecting the period when determining the axis of symmetry.
- Assuming the axis of symmetry is always the y-axis or x-axis.

**Notes for generation:**
- Vary the complexity of the phase shift and period.
- Include functions like sine, cosine, or transformations thereof.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q18`: The question requires understanding how the phase shift and period of a cosine function affect its symmetry, and then using this to find the value of the function at a specific point.

---
```

---

```markdown
## **M_f1d0708a. Relating Area Ratio to Angle Value**

**Core move:** Use the formula relating area, sides, and the sine of an included angle to connect the ratio of areas of two triangles to the cosine of an angle via trigonometric identities.

**Seen in / context:**
- Problems involving ratios of triangle areas where side lengths are known or can be related.
- Questions requiring manipulation of trigonometric identities (e.g., sin^2(x) + cos^2(x) = 1).
- Problems where the angle between two sides of a triangle is the key unknown.

**Possible wrong paths:**
- Incorrectly applying the area formula for a triangle (e.g., using the wrong angle).
- Failing to recognize the connection between the sine of an angle and its cosine using trigonometric identities.
- Making algebraic errors when manipulating the area ratio equation.

**Notes for generation:**
- Ensure the given information allows for expressing the area ratio in terms of trigonometric functions.
- Consider using special angles (30, 45, 60 degrees) to simplify calculations.
- The question can involve finding the angle or a trigonometric function of the angle.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q19`: The area ratio can be expressed in terms of sin(x), which can then be related to cos(x) using sin^2(x) + cos^2(x) = 1.

---
```

---

```markdown
## **M_c8e30a67. Pairing and Summing Trigonometric Values**

**Core move:** Pair terms that sum to a convenient angle (e.g., 90 degrees) and use trigonometric identities to simplify the sum.

**Seen in / context:**
- Trigonometric expressions with multiple terms.
- Simplifying sums of trigonometric functions with related angles.
- Problems where direct calculation is difficult or impossible.

**Possible wrong paths:**
- Attempting to evaluate each term individually without pairing.
- Incorrectly applying trigonometric identities.
- Ignoring the relationships between angles in the expression.

**Notes for generation:**
- Use angles that sum to easily simplified values (e.g., π/2, π).
- Ensure direct calculation of individual terms is difficult.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2018_Q20`: Pair terms to sum angles to π/2, then use sin(π/2 - x) = cos(x) to simplify.

---
```

---

```markdown
## **M_9c358164. Using Turning Points to Define Quadratics**

**Core move:** Use the turning point form of a quadratic and another point to determine the coefficients of the quadratic function.

**Seen in / context:**
- Problems where the turning point of a quadratic is given.
- Finding the equation of a quadratic given its turning point and another point.
- Quadratics expressed in the form a(x-h)^2 + k.

**Possible wrong paths:**
- Incorrectly substituting the turning point coordinates.
- Expanding the squared term incorrectly.
- Solving for the leading coefficient 'a' with algebraic errors.

**Notes for generation:**
- Ensure the turning point is clearly identifiable.
- Provide a second point that is easy to work with.
- The question should require finding the equation of the quadratic.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q1`: The question requires finding the value of a constant in a quadratic, given its turning point and another point on the curve.
- `TMUA_Paper1_2017_Q1`: The question requires finding the equation of a quadratic given its turning point and another point on the curve.
- `TMUA_Paper1_2020_Q1`: The question requires finding the equation of a quadratic given its turning point and another point on the curve.

---
```

---

```markdown
## **M_99bafe32. Completing the Square and Discriminant**

**Core move:** Transform the quadratic expression into completed square form and analyze the discriminant to determine conditions for the expression's positivity or the existence of real roots.

**Seen in / context:**
- Determining the range of a quadratic function.
- Finding conditions for a quadratic equation to have real roots.
- Identifying the minimum or maximum value of a quadratic expression.
- Solving inequalities involving quadratic expressions.

**Possible wrong paths:**
- Incorrectly completing the square, leading to an inaccurate expression.
- Forgetting to consider the sign of the leading coefficient when determining positivity.
- Confusing the conditions for real, distinct, repeated, or complex roots based on the discriminant.
- Not considering edge cases or boundary conditions in inequalities.

**Notes for generation:**
- Vary the complexity of the quadratic expression.
- Include parameters that must be determined based on the conditions for positivity or real roots.
- Ensure that the question requires a thorough understanding of the relationship between the discriminant and the nature of the roots.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q2`: Requires completing the square to find the minimum value of a quadratic and then setting up an inequality based on the given condition.
```

---

```markdown
## **M_28ab9c68. Sum of Coefficients in Polynomial Series**

**Core move:** Recognize the expression as a geometric series and apply the formula for the sum of a geometric series to simplify before extracting the coefficient.

**Seen in / context:**
- Finding the sum of a finite geometric series.
- Determining the coefficient of a specific term in a polynomial expansion.
- Simplifying expressions involving powers and series.

**Possible wrong paths:**
- Expanding the entire series and then collecting terms, which is inefficient.
- Incorrectly applying the geometric series formula (e.g., using the wrong ratio or number of terms).
- Forgetting to simplify the expression before extracting the coefficient.

**Notes for generation:**
- Vary the complexity of the geometric series.
- Change the target coefficient to require different levels of simplification.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q3`: Recognizing the series as geometric, summing it, and then finding the coefficient of x^2.
---
```

---

```markdown
## **M_b1ccdfe7. Iterative Application of a Function**

**Core move:** Repeatedly apply a function to an initial value to determine the value after a specific number of iterations.

**Seen in / context:**
- Problems involving recursively defined sequences.
- Finding the nth term of a sequence defined by a recurrence relation.
- Evaluating the long-term behavior of a system after repeated applications of a rule.

**Possible wrong paths:**
- Incorrectly applying the function in each iteration.
- Making an arithmetic error when calculating the result of each iteration.
- Failing to recognize a pattern or simplification that emerges after a few iterations.

**Notes for generation:**
- Use functions that are easy to compute for a few iterations but become tedious for many.
- Consider functions with fixed points or cyclical behavior.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q4`: The question requires repeatedly applying a function to an initial value and identifying the value after a specified number of iterations.

---
```

---

```markdown
## **M_e4ac8c9c. Relating Sums and Terms in Geometric Sequence**

**Core move:** Relate the sum of a geometric series to its terms using the geometric series sum formula and properties of geometric sequences to derive relationships between terms.

**Seen in / context:**
- Problems involving geometric sequences and series.
- Questions requiring manipulation of the geometric series sum formula.
- Problems asking for a specific term given the sum and other terms.

**Possible wrong paths:**
- Incorrectly applying the geometric series sum formula.
- Assuming an arithmetic sequence instead of a geometric sequence.
- Algebraic errors when manipulating equations involving sums and terms.

**Notes for generation:**
- Questions can involve finding a specific term, the common ratio, or the number of terms.
- Vary the given information (e.g., sum and first term, or two terms).
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q5`: Using the formula for the sum of a geometric series and the relationship between terms in a geometric sequence to find the value of a specific term.

---
```

---

```markdown
## **M_631d1176. Distance between centers equals sum/difference of radii**

**Core move:** Relate the distance between the centers of two circles to the sum or difference of their radii based on whether the circles are externally or internally tangent.

**Seen in / context:**
- Problems involving tangent circles.
- Finding the distance between the centers of tangent circles.
- Determining the radii of tangent circles given the distance between their centers.

**Possible wrong paths:**
- Assuming the circles intersect when the distance between centers equals the sum/difference of radii.
- Confusing the conditions for external and internal tangency.
- Incorrectly applying the Pythagorean theorem when a right triangle can be formed using the radii and distance between centers.

**Notes for generation:**
- Vary the information given (radii, distance between centers) and ask for the missing value.
- Consider scenarios with multiple tangent circles.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q6`: Recognize that for externally tangent circles, the distance between the centers is the sum of the radii, and for internally tangent circles, it's the difference.
---
```

---

```markdown
## **M_27865448. Optimization via Differentiation and Evaluation**

**Core move:** Find the minimum of a function by differentiating with respect to a parameter, setting the derivative to zero, and evaluating the original function at the critical point.

**Seen in / context:**
- Finding stationary points of a function.
- Minimizing a distance or cost function.
- Optimization problems involving a single variable.

**Possible wrong paths:**
- Forgetting to check the second derivative to confirm a minimum.
- Incorrectly differentiating the function.
- Solving the derivative equation incorrectly.

**Notes for generation:**
- The function should be differentiable.
- The problem should involve finding a minimum (or maximum) value.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q7`: The question requires finding the minimum distance, which is achieved by differentiating the distance function, setting the derivative to zero, and solving for the parameter.

---
```

---

```markdown
## **M_f2e1cd86. Transforming Functions to Change Error Type**

**Core move:** Transform a function or its domain to change the concavity and thus the error type (underestimate vs. overestimate) of the trapezium rule.

**Seen in / context:**
- Questions involving the trapezium rule and error bounds.
- Problems where the error type (over/under estimate) needs to be determined.
- Situations where a direct application of the trapezium rule is not optimal.

**Possible wrong paths:**
- Assuming the error type without considering the function's concavity.
- Incorrectly applying transformations to the function or its domain.
- Neglecting the effect of the transformation on the integral's value.

**Notes for generation:**
- Consider functions with easily modifiable concavity (e.g., polynomials, exponentials).
- Transformations can include reflections, translations, or scaling.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q8`: The question requires understanding how a reflection affects the concavity and therefore the error in the trapezium rule approximation.

---
```

---

```markdown
## **M_51c5355b. Area between curves via integration**

**Core move:** Find the points of intersection of the curves, then integrate the difference between the functions over the interval defined by those points.

**Seen in / context:**
- Finding the area between a curve and the x-axis.
- Finding the area between two intersecting curves.
- Problems involving definite integrals and geometric interpretation.

**Possible wrong paths:**
- Integrating without finding the points of intersection, leading to incorrect limits.
- Integrating the functions separately and subtracting the areas without considering which function is "above" the other.
- Forgetting to take the absolute value of the integral if the functions cross within the interval.

**Notes for generation:**
- Vary the types of functions involved (polynomial, trigonometric, exponential).
- Include cases where finding the points of intersection requires solving a non-trivial equation.
- Consider scenarios where the curves intersect multiple times, requiring multiple integrals.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q9`: The question requires finding the area between two curves by first determining their intersection points and then integrating the difference of the functions.
- `TMUA_Paper1_2017_Q12`: Requires setting up and solving an integral to find the area under a curve, which is a related concept.
- `TMUA_Paper1_2016_Q14`: This question involves understanding how integration can be used to calculate areas, and requires careful consideration of the limits of integration.

---
```

---

```markdown
## **M_2fecad55. Simultaneous Equations with Logarithmic Manipulation**

**Core move:** Solve for variables in a system of equations by using logarithm properties to simplify expressions and then substituting to eliminate variables.

**Seen in / context:**
- Systems of equations involving logarithmic terms.
- Equations where logarithmic properties can be used to isolate variables.
- Problems requiring the application of log rules (product, quotient, power).

**Possible wrong paths:**
- Incorrectly applying logarithmic properties (e.g., confusing log(a+b) with log(a) + log(b)).
- Failing to account for the domain of logarithmic functions (arguments must be positive).
- Making algebraic errors during substitution and simplification.

**Notes for generation:**
- Ensure the equations involve logarithmic terms that can be simplified.
- The system should be solvable through substitution after logarithmic manipulation.
- Consider using different bases for the logarithms to add complexity.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q11`: Logarithmic properties are used to simplify the equations, allowing for substitution and solution of the system.

---
```

---

```markdown
## **M_7fb43942. Integration to Find Function Value**

**Core move:** Integrate the given rate of change function to find the function itself, using the initial condition to determine the constant of integration, and then evaluate the function at the desired point.

**Seen in / context:**
- Problems involving rates of change where the value of the function at a specific point is required.
- Questions providing a derivative and an initial condition.
- Finding displacement given a velocity function.

**Possible wrong paths:**
- Forgetting to include the constant of integration.
- Incorrectly using the initial condition to solve for the constant of integration.
- Integrating incorrectly.

**Notes for generation:**
- Ensure the rate of change function is integrable.
- Provide a clear initial condition.
- The question should require evaluating the integrated function at a specific point.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q12`: This question provides a derivative and an initial condition, requiring integration to find the function and then evaluation at a specific point.

---
```

---

```markdown
## **M_6d1943bc. TMUA: Transform, Substitute, Find Max/Min, Back-substitute**

**Core move:** Transform the expression into a more manageable form using substitution, find the maximum/minimum of the transformed expression, and then back-substitute to find the maximum/minimum of the original expression.

**Seen in / context:**
- Optimisation problems involving complex expressions.
- Problems where a direct approach to finding the maximum or minimum is difficult.
- Situations where substitution simplifies the expression to a standard form (e.g., quadratic).

**Possible wrong paths:**
- Forgetting to back-substitute to find the maximum/minimum of the *original* expression.
- Making errors during the substitution or back-substitution process.
- Incorrectly identifying the maximum/minimum of the transformed expression.

**Notes for generation:**
- Ensure the substitution simplifies the expression significantly.
- The back-substitution step should be non-trivial.
- The transformed expression should have a clear maximum or minimum.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q13`: The question requires substituting a variable to simplify the expression, finding the maximum of the simplified expression, and then back-substituting to find the corresponding value of the original variable.

---
```

---

```markdown
## **M_b294de21. Simultaneous Trigonometric Equations Solution**

**Core move:** Solve a system of trigonometric equations to find possible values of a variable within a given range, then sum those values.

**Seen in / context:**
- Solving trigonometric equations involving sine, cosine, or tangent.
- Finding solutions within a specific interval (e.g., 0 to 2π).
- Summing the solutions to a trigonometric equation.

**Possible wrong paths:**
- Forgetting to consider all possible solutions within the given range.
- Incorrectly applying trigonometric identities.
- Making algebraic errors when solving the equations.

**Notes for generation:**
- Use trigonometric equations that require the application of identities.
- Ensure the range of possible solutions is clearly defined.
- The final answer should involve summing the valid solutions.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q14`: Requires solving simultaneous trigonometric equations, finding solutions within a given range, and summing those solutions.

---
```

---

```markdown
## **M_eda30b80. Transform Equation to Isolate Variable**

**Core move:** Transform the given equation using algebraic manipulation and logarithmic properties to isolate the variable and solve for its value.

**Seen in / context:**
- Equations involving exponents and logarithms.
- Problems requiring the isolation of a specific variable.
- Situations where algebraic manipulation is necessary to simplify the equation.

**Possible wrong paths:**
- Incorrectly applying logarithmic properties (e.g., confusing log(a+b) with log(a) + log(b)).
- Making algebraic errors while manipulating the equation.
- Failing to consider all possible solutions (e.g., extraneous solutions).

**Notes for generation:**
- Ensure the equation requires multiple steps of algebraic and/or logarithmic manipulation.
- Vary the complexity of the algebraic expressions involved.
- Include equations where extraneous solutions are possible.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q15`: The question requires using logarithm rules and algebraic manipulation to isolate x.

---
```

---

```markdown
## **M_134a771b. Integral Manipulation and Substitution**

**Core move:** Manipulate given integrals using properties of definite integrals and substitution to isolate and compute the desired integral.

**Seen in / context:**
- Using properties like linearity, additivity over intervals, or symmetry to simplify integrals.
- Applying u-substitution to change the variable of integration and simplify the integrand.
- Combining multiple integral properties and substitutions to solve for an unknown integral.

**Possible wrong paths:**
- Incorrectly applying the limits of integration after a u-substitution.
- Misapplying integral properties, such as assuming linearity where it doesn't exist.
- Choosing an ineffective substitution that complicates the integral further.

**Notes for generation:**
- Create questions where a direct computation of the integral is difficult or impossible without manipulation.
- Require multiple steps of manipulation and substitution.
- Vary the complexity of the integrand and the required substitutions.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q16`: Apply u-substitution and properties of definite integrals to isolate and compute the desired integral value.

---
```

---

```markdown
## **M_89880ddd. Sign Analysis of Product of Functions**

**Core move:** Determine the intervals where each factor is positive or negative, then combine these to find where the product is non-negative.

**Seen in / context:**
- Solving inequalities involving products or quotients of functions.
- Determining the domain of a function involving square roots or other restrictions.
- Analyzing the behavior of a function around its critical points.

**Possible wrong paths:**
- Incorrectly determining the sign of a factor over a given interval.
- Forgetting to consider critical points where a factor equals zero.
- Making sign errors when combining the signs of different factors.

**Notes for generation:**
- Factors can be linear, quadratic, or other functions.
- The product can be compared to zero or another function.
- Consider including factors with repeated roots.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q17`: Identify the intervals where the product of several linear factors is non-negative by considering the sign of each factor in each interval.

---
```

---

```markdown
## **M_7a72bb38. Optimization by Minimizing Distance Function**

**Core move:** Find the point on a curve where its tangent is parallel to a given line, then calculate the perpendicular distance between that point and the line.

**Seen in / context:**
- Optimization problems involving minimizing distance.
- Problems where the distance between a curve and a line needs to be minimized.
- Coordinate geometry problems involving tangents and perpendicular distances.

**Possible wrong paths:**
- Minimizing the distance between the line and an arbitrary point on the curve without considering the tangent.
- Incorrectly calculating the gradient of the tangent or the perpendicular distance.
- Algebraic errors when solving for the point of tangency.

**Notes for generation:**
- Vary the type of curve (e.g., quadratic, cubic, circle).
- Vary the equation of the line.
- Ensure the algebra is solvable without excessive computation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q18`: This question requires finding the minimum distance between a curve and a line by finding the point where the tangent is parallel to the line.

---
```

---

```markdown
## **M_d54474fb. Analyzing Intersection Points and Parameter Range**

**Core move:** Determine the range of a parameter by relating it to the number and sign of intersection points between two curves or functions.

**Seen in / context:**
- Finding the range of a parameter for which two curves intersect at a specific number of points.
- Determining the conditions for a quadratic equation to have two distinct positive roots.
- Analyzing the sign of solutions to determine parameter constraints.

**Possible wrong paths:**
- Neglecting to consider the discriminant of a quadratic equation when determining the number of real roots.
- Incorrectly interpreting the sign of the roots in relation to the parameter.
- Forgetting to check endpoint values when dealing with inequalities.

**Notes for generation:**
- Focus on problems where the parameter affects the position or shape of a curve.
- Vary the types of functions involved (linear, quadratic, trigonometric, etc.).
- Ensure the relationship between the parameter and the intersection points is not immediately obvious.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2019_Q20`: The question requires finding the range of `k` such that the equation `x^2 + 2kx + k = 0` has two distinct positive roots. This involves analyzing the discriminant, the sum of the roots, and the product of the roots to establish inequalities for `k`.
- `P_Dummy_Q1`: A question could involve finding the range of `a` such that the curves `y = x^2 + a` and `y = 2x` intersect at exactly one point. This requires setting the equations equal, forming a quadratic, and analyzing its discriminant.
- `P_Dummy_Q2`: A question could involve finding the range of `b` such that the equation `sin(x) = b*x` has three intersection points. This requires understanding the behavior of sine function and linear function.

---
```

---

```markdown
## **M_e83211db. Algebraic Manipulation and Simplification of Expressions**

**Core move:** Manipulate an algebraic expression (often a derivative) into a simplified form that matches one of the provided options.

**Seen in / context:**
- Simplifying derivatives after applying the chain rule.
- Combining terms after partial fraction decomposition.
- Rationalizing denominators to match a target expression.

**Possible wrong paths:**
- Incorrectly applying algebraic identities.
- Making errors in arithmetic when combining terms.
- Stopping simplification prematurely, failing to reach the required form.

**Notes for generation:**
- Focus on algebraic manipulation, not calculus knowledge.
- Include multiple steps of simplification to increase difficulty.
- The target expression should be subtly different from the initial form.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q1`: The correct answer requires simplifying the derivative using algebraic manipulation to match one of the options.

---
```

---

## **M_649b4ad5. Factor Theorem and System of Equations**

**Core move:** Use the factor theorem to generate equations by substituting roots into a polynomial, then solve the resulting system of equations to find unknown coefficients.

**Seen in / context:**
- Polynomial equations where some coefficients are unknown.
- Problems providing factors or roots of a polynomial.
- Questions requiring the determination of unknown polynomial coefficients.

**Possible wrong paths:**
- Incorrectly applying the factor theorem (e.g., substituting the root without setting the polynomial equal to zero).
- Making algebraic errors when solving the system of equations.
- Failing to recognize the need to create a system of equations.

**Notes for generation:**
- Vary the degree of the polynomial and the number of unknown coefficients.
- Ensure the resulting system of equations is solvable (unique solution).
- Consider using roots that are integers or simple fractions.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q2`: The question provides a polynomial with unknown coefficients and a known factor; the factor theorem is used to generate an equation, which is then solved alongside another equation derived from the given information.

---

```markdown
## **M_7b38a4b8. Solving Inequalities by Interval Analysis**

**Core move:** Determine the intervals where the expression is positive or negative based on the roots and sign changes of the factors.

**Seen in / context:**
- Solving inequalities involving rational functions.
- Determining the solution set for inequalities with multiple factors.
- Identifying intervals where a function is above or below zero.

**Possible wrong paths:**
- Forgetting to consider the sign changes at each root.
- Incorrectly determining the sign of the expression in a given interval.
- Ignoring the roots of the denominator when dealing with rational functions.

**Notes for generation:**
- Focus on inequalities with multiple factors or rational expressions.
- Vary the complexity of the factors (linear, quadratic, etc.).
- Include cases where the roots have different multiplicities.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q3`: Correctly identifies the intervals where the inequality holds by considering the sign changes at the roots of the factors.
---
```

---

```markdown
## **M_d7d2c980. Equating and Solving Simultaneous Equations**

**Core move:** Formulate equations based on given relationships between variables and solve them simultaneously to find the value of a specific variable.

**Seen in / context:**
- Problems involving multiple unknowns with given relationships.
- Situations where direct calculation of the desired variable is not immediately possible.
- Problems requiring the creation of a system of equations from word problems.

**Possible wrong paths:**
- Incorrectly formulating the equations, misinterpreting the relationships between variables.
- Making algebraic errors when solving the simultaneous equations.
- Solving for the wrong variable or not answering the specific question asked.

**Notes for generation:**
- Vary the context and the type of relationships between variables (linear, quadratic, etc.).
- Ensure that the system of equations is solvable and leads to a unique solution.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q4`: The question requires setting up simultaneous equations based on the given information about the number of sweets each person has and then solving for the number of sweets one person has.
---
```

---

```markdown
## **M_5b887159. Relating Properties to Equation Coefficients**

**Core move:** Use given properties of a mathematical object (e.g., symmetry, tangency, roots) to form equations involving unknown coefficients, then solve for the desired expression.

**Seen in / context:**
- Problems involving polynomials where roots have specific relationships.
- Finding the equation of a tangent line to a curve.
- Utilizing symmetry properties of functions or geometric shapes to constrain equations.
- Problems involving circles or other geometric objects where tangency conditions are given.

**Possible wrong paths:**
- Incorrectly translating geometric or algebraic properties into equations.
- Making algebraic errors when solving the system of equations.
- Overlooking a possible solution or constraint.
- Assuming a relationship that is not explicitly stated.

**Notes for generation:**
- The properties given should lead to a solvable system of equations.
- Ensure the desired expression is not directly given in the problem statement.
- Vary the type of mathematical object (polynomial, circle, etc.) and the properties given.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q5`: Symmetry of roots implies a relationship between coefficients, allowing for solving the unknown.
---
```

---

```markdown
## **M_2e3e2a28. Solving Simultaneous Equations for Sum**

**Core move:** Solve a system of simultaneous equations to find the values of the variables, then sum them.

**Seen in / context:**
- Problems involving multiple unknowns related by linear equations.
- Questions where the final answer requires the sum of the unknowns.
- Situations where direct calculation of individual variables is necessary before summing.

**Possible wrong paths:**
- Attempting to directly calculate the sum without solving for individual variables.
- Making algebraic errors while solving the simultaneous equations.
- Incorrectly combining or manipulating the equations.

**Notes for generation:**
- Create systems of equations that require careful algebraic manipulation.
- Ensure the final answer requires summing the variables found.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q7`: Requires solving simultaneous equations to find x and y, then calculating x+y.

---
```

---

```markdown
## **M_b909d94f. Finding Maximum Value and Applying Inequality**

**Core move:** Determine the maximum value of a function by completing the square or using calculus, and then apply a given inequality to a parameter in the function based on this maximum.

**Seen in / context:**
- Problems involving quadratic expressions where a maximum or minimum value is constrained.
- Optimization problems where a parameter must satisfy a condition based on the extreme value of a function.
- Questions requiring algebraic manipulation to express a function in a form suitable for finding its maximum or minimum.

**Possible wrong paths:**
- Incorrectly completing the square, leading to an inaccurate maximum value.
- Forgetting to consider the domain of the function when determining the maximum.
- Misinterpreting the inequality constraint, applying it to the wrong variable or in the wrong direction.

**Notes for generation:**
- The function should usually be quadratic to keep the problem accessible.
- The inequality constraint should involve a parameter within the function's definition.
- The question can be made more challenging by requiring algebraic manipulation before the maximum can be found.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q8`: The question requires finding the maximum of a quadratic and then using an inequality to constrain a parameter within the quadratic.
---
```

---

```markdown
## **M_85336f59. Relating Roots and Coefficients**

**Core move:** Use Vieta's formulas to relate the roots and coefficients of a polynomial, then manipulate these relationships to find a new polynomial with roots derived from the original roots.

**Seen in / context:**
- Constructing a polynomial with roots that are transformations of the roots of a given polynomial.
- Finding the sum or product of transformed roots without explicitly solving for the original roots.
- Problems involving symmetric expressions in the roots of a polynomial.

**Possible wrong paths:**
- Attempting to solve for the roots of the original polynomial directly, which may be difficult or impossible.
- Incorrectly applying Vieta's formulas, especially with polynomials of higher degree.
- Forgetting to account for the leading coefficient when constructing the new polynomial.

**Notes for generation:**
- Vary the transformation applied to the roots (e.g., squaring, adding a constant, taking the reciprocal).
- Use polynomials of varying degrees to adjust the difficulty.
- The transformation of the roots can involve multiple operations.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q9`: The question requires finding a polynomial whose roots are the squares of the roots of a given cubic polynomial, using Vieta's formulas to relate the coefficients of the new polynomial to the coefficients of the original.

---
```

---

```markdown
## **M_6ba4afe9. Apply transformations sequentially to equation**

**Core move:** Apply each transformation to the equation in the specified order, updating the equation after each step.

**Seen in / context:**
- Solving equations where multiple operations must be applied.
- Function transformations applied in a specific sequence.
- Problems involving iterative calculations or algorithms.

**Possible wrong paths:**
- Applying transformations in the wrong order.
- Forgetting to update the equation after each transformation.
- Incorrectly applying a specific transformation.

**Notes for generation:**
- Use multiple transformations to be applied in a specific order.
- Ensure the order of transformations significantly impacts the final result.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q10`: The question requires applying transformations to an equation in a specific order to find the value of x. Applying the transformations in the wrong order will lead to an incorrect answer.

---
```

---

```markdown
## **M_4247a5de. Equating Areas via Geometric Properties**

**Core move:** Relate geometric properties (areas) to algebraic representations (function parameters) and solve for unknowns by equating expressions representing these properties.

**Seen in / context:**
- Problems involving geometric shapes where areas can be expressed in multiple ways.
- Questions requiring the determination of unknown lengths or parameters based on area relationships.
- Scenarios where different area formulas (e.g., triangle, rectangle, circle) are applicable to the same region.
- Problems that involve setting up and solving equations based on geometric area constraints.

**Possible wrong paths:**
- Incorrectly applying area formulas for different geometric shapes.
- Failing to account for overlapping areas or regions when setting up equations.
- Making algebraic errors when solving the equations derived from area relationships.
- Overlooking geometric constraints or relationships that simplify the problem.

**Notes for generation:**
- Focus on problems where area can be expressed in terms of unknown variables.
- Ensure that multiple valid expressions for the same area can be derived.
- The solution should involve equating these expressions and solving for the unknowns.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q11`: The question requires setting up an equation by equating two different expressions for the area of a triangle, allowing for the determination of an unknown parameter.

---
```

---

```markdown
## **M_477712cb. Graphical Intersection for Solution Count**

**Core move:** Determine the number of solutions to an equation by finding the number of intersections between the graphs of two functions derived from the equation.

**Seen in / context:**
- Finding the number of real roots of an equation.
- Solving equations where direct algebraic manipulation is difficult.
- Problems involving trigonometric functions or other non-algebraic functions.

**Possible wrong paths:**
- Attempting to solve the equation algebraically without considering graphical methods.
- Misinterpreting the graphs or incorrectly counting the intersections.
- Forgetting to consider the domain of the functions when counting intersections.

**Notes for generation:**
- Ensure the equation can be easily split into two functions suitable for graphing.
- Vary the types of functions involved (e.g., trigonometric, polynomial, exponential).
- The difficulty can be adjusted by changing the complexity of the functions.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q12`: The question requires finding the number of solutions by considering the intersections of two graphs.

---
```

---

```markdown
## **M_f8efb45c. Area Calculation with Variable & Equation Solving**

**Core move:** Set up a definite integral representing the area between two curves, equate it to a given area value, and solve the resulting equation for an unknown parameter within the curve equations.

**Seen in / context:**
- Finding the area between curves defined by functions with unknown parameters.
- Using definite integration to represent area.
- Solving equations (often polynomial) resulting from integration.

**Possible wrong paths:**
- Incorrectly setting up the limits of integration.
- Making algebraic errors when evaluating the definite integral.
- Failing to consider multiple possible solutions for the unknown parameter.

**Notes for generation:**
- Vary the complexity of the functions defining the curves (e.g., polynomials, trigonometric functions).
- The unknown parameter can appear in different parts of the function (e.g., coefficient, exponent, constant term).
- The resulting equation to solve can be linear, quadratic, or require more advanced algebraic techniques.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q14`: The question requires setting up an integral for the area between a line and a curve, equating it to a given area, and solving for the unknown gradient of the line.

---
```

---

```markdown
## **M_f4998f40. Substitution and Quadratic Equation Solving**

**Core move:** Substitute a variable to transform the equation into a quadratic form, solve for the substituted variable, and then solve for the original variable.

**Seen in / context:**
- Equations involving fractional powers or radicals where squaring or other substitutions can lead to a quadratic.
- Equations where a repeated expression suggests a substitution to simplify the problem.
- Problems where the relationship between the original variable and the substituted variable must be carefully considered when finding all solutions.

**Possible wrong paths:**
- Forgetting to solve for the original variable after finding the values of the substituted variable.
- Not considering both positive and negative roots when undoing a square.
- Introducing extraneous solutions by squaring or performing other non-reversible operations without checking.

**Notes for generation:**
- Ensure the substitution leads to a solvable quadratic equation.
- Vary the complexity of the relationship between the original and substituted variables.
- Include cases where extraneous solutions are possible.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q15`: The question requires substituting $y = x^{1/6}$ to solve the equation $x^{1/3} - 5x^{1/6} + 6 = 0$, then solving for $x$.

---
```

---

```markdown
## **M_960ba078. Geometric Properties to Algebraic Representation**

**Core move:** Translate geometric properties (tangency, angles, equations of circles) into algebraic equations to solve for an unknown.

**Seen in / context:**
- Problems involving circles and tangents.
- Finding the center or radius of a circle given geometric constraints.
- Determining the equation of a locus based on geometric properties.

**Possible wrong paths:**
- Incorrectly applying geometric theorems or definitions.
- Making algebraic errors when manipulating equations.
- Failing to recognize the relevant geometric properties.

**Notes for generation:**
- Ensure the geometric properties can be expressed as algebraic equations.
- Vary the geometric properties (tangency, angles, circle equations).
- The unknown can be a length, angle, or coordinate.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q16`: Translate the tangency condition into an algebraic equation involving the circle's center and radius, then solve for the unknown.

---
```

---

```markdown
## **M_87984f69. Intersection Condition via Discriminant Analysis**

**Core move:** Determine the condition for intersection points between two functions by equating them, rearranging into a quadratic, and analyzing the discriminant.

**Seen in / context:**
- Finding the condition for tangency between a line and a curve.
- Determining the number of real roots of a quadratic equation.
- Problems involving the intersection of two curves or functions.

**Possible wrong paths:**
- Forgetting to rearrange the equation into the standard quadratic form before calculating the discriminant.
- Incorrectly calculating the discriminant (e.g., confusing the coefficients).
- Misinterpreting the meaning of the discriminant (e.g., confusing b^2-4ac > 0 with one intersection point).

**Notes for generation:**
- Vary the types of functions being intersected (linear, quadratic, etc.).
- Ask for conditions leading to tangency, two intersection points, or no intersection points.
- The quadratic can be disguised within a more complex equation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q17`: The question requires setting two equations equal, rearranging into a quadratic, and then finding the condition on a parameter such that the discriminant is zero (tangency).
---
```

---

```markdown
## **M_095cefa9. Solving Equations with Absolute Values and Trigonometry**

**Core move:** Split the problem into cases based on the sign of the expression inside the absolute value, solve each case separately, and combine the solutions.

**Seen in / context:**
- Solving equations involving absolute value functions.
- Solving equations involving trigonometric functions within absolute values.
- Problems where the absolute value introduces different solution sets depending on the input.

**Possible wrong paths:**
- Ignoring the absolute value and solving only for the positive case.
- Incorrectly handling the sign change when removing the absolute value.
- Forgetting to check if solutions obtained in each case satisfy the initial conditions for that case.

**Notes for generation:**
- Use absolute values with algebraic or trigonometric expressions.
- Ensure that solutions obtained from each case are valid within the defined interval.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q18`: This question requires splitting the problem into cases based on the sign of the expression inside the absolute value to find the correct solution set.
---
```

---

```markdown
## **M_789b16ba. Finding Integer Solution Near Boundary**

**Core move:** Determine the integer value that satisfies an inequality by considering values near the boundary point where the expression changes sign.

**Seen in / context:**
- Inequalities involving integers.
- Problems requiring the largest or smallest integer satisfying a condition.
- Situations where direct algebraic manipulation leads to a non-integer solution.

**Possible wrong paths:**
- Rounding the boundary value without checking if the rounded integer actually satisfies the inequality.
- Assuming the nearest integer to the boundary is always the correct solution.
- Forgetting to consider the direction of the inequality (greater than vs. less than).

**Notes for generation:**
- Involve inequalities where the solution is an integer.
- Ensure the boundary value is not an integer.
- The correct answer should require careful consideration of the inequality direction.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q19`: The question requires finding the largest integer `n` that satisfies an inequality. The boundary value is not an integer, so one must consider the integers immediately above and below the boundary to determine which satisfies the inequality.

---
```

---

```markdown
## **M_0fa9852e. Analyzing Roots of Polynomial Equations**

**Core move:** Determine the conditions under which a polynomial equation has a specific number of distinct roots by analyzing the factors and their potential for repeated or shared roots.

**Seen in / context:**
- Determining the number of distinct solutions to a polynomial equation.
- Identifying conditions on coefficients that lead to specific root configurations.
- Analyzing the discriminant or other properties to infer root characteristics.

**Possible wrong paths:**
- Assuming that the degree of the polynomial directly corresponds to the number of distinct roots.
- Overlooking the possibility of repeated roots.
- Incorrectly factoring the polynomial.

**Notes for generation:**
- Vary the degree and complexity of the polynomial.
- Include cases with repeated roots or specific conditions on the coefficients.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2020_Q20`: Recognizing that the number of distinct roots depends on the values of parameters and analyzing the discriminant to determine the conditions for distinct roots.
---
```

---

```markdown
## **B_d0e63584. Providing Alternatives Due to Limitations**

**Core move:** Acknowledges limitations of the current format and offers an alternative solution to meet user needs.

**Seen in / context:**
- When a direct calculation is difficult or impossible with the given information.
- When the standard approach leads to a dead end or a more complex solution.
- When the question hints at or allows for multiple solution paths.

**Possible wrong paths:**
- Persisting with the initial approach despite its limitations.
- Overlooking simpler alternative methods.
- Failing to recognize the limitations of the given information.

**Notes for generation:**
- Design questions where a standard method is less efficient or impossible.
- Include information that subtly suggests an alternative approach.
- Ensure the alternative is mathematically valid and leads to a correct answer.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2020_Q24`: Recognizing that directly solving the equation is difficult, and instead considering the possible values of the expression based on the given constraints.

---
```

---

## **M_5f41afb5. Equation from Geometric Constraints and Intersection**

**Core move:** Derive an equation by using geometric constraints and intersection conditions to relate variables and solve for unknowns.

**Seen in / context:**
- Problems involving circles, lines, and other geometric figures.
- Finding points of intersection between curves.
- Problems where geometric properties (e.g., tangency, perpendicularity) provide equations.

**Possible wrong paths:**
- Incorrectly applying geometric formulas or theorems.
- Making algebraic errors when manipulating equations.
- Failing to account for all geometric constraints.

**Notes for generation:**
- Ensure the geometric constraints are sufficient to form a solvable equation.
- Vary the types of geometric objects involved (circles, lines, etc.).
- - From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q1`: Geometric constraints (tangency of a circle to the x-axis and passing through a point) are used to derive an equation for the circle's center, allowing us to find the possible values of the x-coordinate.
---

```markdown
## **M_ec4f56c4. Definite Integral Between Turning Points**

**Core move:** Evaluate a definite integral where the limits are the x-coordinates of turning points of the integrand.

**Seen in / context:**
- Finding turning points by setting the derivative equal to zero.
- Solving the resulting equation to find the x-coordinates of the turning points.
- Substituting the x-coordinates into the original function to find the y-coordinates (though these are not needed for the definite integral).

**Possible wrong paths:**
- Forgetting to find all relevant turning points within the domain.
- Incorrectly solving the derivative equation, leading to wrong turning points.
- Integrating the derivative instead of the original function.

**Notes for generation:**
- The function should have easily identifiable turning points.
- The integral should be straightforward to evaluate once the limits are known.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q2`: Requires finding the turning points of a cubic and then integrating between them.
---
```

---

```markdown
## **M_121ea60e. Simultaneous Equations from Sequence Properties**

**Core move:** Formulate simultaneous equations based on the properties of arithmetic and geometric progressions, then solve for the unknowns to find the desired value.

**Seen in / context:**
- Problems involving both arithmetic and geometric sequences.
- Questions requiring the combination of sequence properties to form equations.
- Problems where the unknowns are terms or parameters of the sequences.

**Possible wrong paths:**
- Incorrectly applying the formulas for arithmetic or geometric sequences.
- Making algebraic errors when solving the simultaneous equations.
- Failing to recognize the relationships between the terms of the sequences.

**Notes for generation:**
- Vary the properties given for the arithmetic and geometric sequences.
- Change the unknowns to be solved for (e.g., a specific term, the common difference, or the common ratio).
- Ensure the resulting simultaneous equations are solvable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q3`: This question requires setting up simultaneous equations based on the properties of arithmetic and geometric progressions and then solving for the common ratio.

---
```

---

```markdown
## **M_ad288208. Function Minimization via Algebraic Manipulation**

**Core move:** Rewrite the function into a form where the minimum value can be easily identified, often by completing the square or using a substitution.

**Seen in / context:**
- Finding the minimum value of a quadratic expression.
- Optimizing expressions involving squares or absolute values.
- Problems where a clever substitution simplifies the function.
- Determining the range of a function.

**Possible wrong paths:**
- Attempting to use calculus without simplifying the expression first.
- Incorrectly completing the square, leading to an inaccurate minimum.
- Overlooking constraints on the variable that affect the minimum value.
- Assuming the minimum occurs at a critical point without checking the entire domain.

**Notes for generation:**
- Ensure the algebraic manipulation is non-obvious but accessible.
- Consider using inequalities or absolute values to create more complex expressions.
- The minimum value should be an integer or a simple fraction.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q4`: The question requires completing the square to find the minimum value of the given expression.
---
```

---

```markdown
## **M_2bde1491. Functional Equation with Conditional Definition**

**Core move:** Using the conditional definition of a function, deduce unknown values by strategically substituting known values and solving the resulting equation.

**Seen in / context:**
- Functions defined piecewise.
- Solving for specific function values.
- Algebraic manipulation of equations.

**Possible wrong paths:**
- Incorrectly applying the wrong part of the conditional definition.
- Making algebraic errors when solving for the unknown value.
- Not recognizing the need for strategic substitution.

**Notes for generation:**
- The function definition should be conditional (e.g., defined differently for x < 0 and x >= 0).
- The question should require finding a specific function value that isn't immediately obvious.
- The question should involve some algebraic manipulation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q5`: The question requires using the conditional definition of f(x) to find f(f(0)), which involves substituting values and solving an equation.

---
```

---

```markdown
## **M_33fe7017. Function Range via Algebraic Manipulation**

**Core move:** Rewrite the function algebraically to reveal its range by bounding a simpler expression.

**Seen in / context:**
- Finding the range of a function that is not immediately obvious.
- Functions involving trigonometric identities.
- Functions involving squares or other expressions that can be bounded.

**Possible wrong paths:**
- Assuming the range is all real numbers without proper justification.
- Incorrectly simplifying the function.
- Not considering the domain of the function.

**Notes for generation:**
- Create functions where algebraic manipulation is necessary to find the range.
- Consider using trigonometric functions or expressions that can be bounded.
- Ensure the domain is clearly defined and impacts the range.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q6`: The function can be rewritten to isolate a squared term, allowing the minimum value to be determined, and thus the range.
- `TMUA_Paper1_2020_Q1`: The function can be rewritten using trigonometric identities to find the range.
- `TMUA_Paper1_2019_Q1`: The function can be rewritten by completing the square to find the range.

---
```

---

```markdown
## **M_072bb6cb. Using Integral Properties and Symmetry**

**Core move:** Exploit properties of integrals, such as linearity and additivity, and function symmetry (even/odd) to deduce the value of a related integral without explicit calculation.

**Seen in / context:**
- Evaluating definite integrals where a direct antiderivative is difficult to find.
- Simplifying integrals by breaking them into smaller intervals based on symmetry.
- Problems involving integrals of odd functions over symmetric intervals.
- Using the property ∫(a to b) f(x) dx = ∫(a to b) f(a+b-x) dx.

**Possible wrong paths:**
- Attempting to find an explicit antiderivative when it's unnecessary or difficult.
- Incorrectly applying symmetry properties (e.g., assuming a function is even when it's not).
- Ignoring the limits of integration when applying symmetry.
- Not recognizing the applicability of integral properties like linearity.

**Notes for generation:**
- Focus on integrals where direct calculation is cumbersome.
- Include functions with clear symmetry or properties that can be exploited.
- Vary the limits of integration to test understanding of symmetry.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q7`: The integrand has symmetry properties that allow for simplification and determination of the integral's value without explicit integration.
```

---

## **M_85acb030. Simultaneous Equations & Discriminant**

**Core move:** Equate expressions from simultaneous equations, rearrange the resulting equation into a quadratic form, and then use the discriminant to determine conditions for a single solution.

**Seen in / context:**
- Finding the condition for a line to be tangent to a curve.
- Determining the number of intersection points between two functions.
- Solving problems where a unique solution is required.

**Possible wrong paths:**
- Incorrectly equating expressions, leading to an incorrect equation.
- Making algebraic errors when rearranging the equation into quadratic form.
- Applying the discriminant formula incorrectly or misinterpreting its results.

**Notes for generation:**
- The equations can involve various functions (linear, quadratic, trigonometric, etc.).
- The question should explicitly or implicitly ask for a single solution or tangency condition.
- Consider varying the complexity of the algebra required to rearrange the equation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q8`: This question requires equating expressions, rearranging into a quadratic, and using the discriminant to find the condition for one solution (tangency).
---

```markdown
## **M_49f3a54c. Geometric Interpretation of Absolute Values**

**Core move:** Transforming an equation with absolute values into a geometric shape and calculating its area using geometric formulas.

**Seen in / context:**
- Equations involving absolute values in two variables.
- Finding the area enclosed by an equation with absolute values.
- Recognizing that |x - a| + |y - b| = c represents a square.

**Possible wrong paths:**
- Incorrectly interpreting the geometric shape formed by the absolute value equation.
- Difficulty in applying appropriate geometric formulas for area calculation.
- Forgetting to consider all cases when dealing with absolute values.

**Notes for generation:**
- Vary the constants and coefficients within the absolute value expressions.
- Consider using different geometric shapes beyond squares (e.g., rotated squares).
- Ensure the geometric shape is closed and has a well-defined area.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q9`: The question requires recognizing that the equation represents a square and then calculating its area.

---
```

---

```markdown
## **M_502f1f3c. Numerical Integration with Trapezium Rule**

**Core move:** Apply the trapezium rule formula with the given number of strips to approximate the definite integral.

**Seen in / context:**
- Approximating the area under a curve.
- Evaluating definite integrals when an analytical solution is difficult or impossible.
- Problems involving a specified number of strips or trapezia.

**Possible wrong paths:**
- Incorrectly applying the trapezium rule formula (e.g., missing the factor of h/2).
- Using the wrong width for the strips (h).
- Making arithmetic errors when summing the y-values.

**Notes for generation:**
- Vary the function to be integrated (polynomial, trigonometric, exponential).
- Vary the number of strips to increase or decrease complexity.
- Include questions where the exact value of the integral is also calculable for comparison.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q10`: Correctly applies the trapezium rule with 4 strips to approximate the integral and identifies the correct range for the true value.
---
```

---

```markdown
## **M_980f7d10. Finding Intervals of Increasing/Decreasing Functions**

**Core move:** Determine where the derivative of a function is negative to find intervals where the function is decreasing.

**Seen in / context:**
- Identifying intervals where a function is increasing or decreasing.
- Relating the sign of the derivative to the function's behavior.
- Solving inequalities to find the intervals where the derivative satisfies a given condition.

**Possible wrong paths:**
- Confusing the sign of the derivative with the function's value.
- Incorrectly solving the inequality for the derivative.
- Forgetting to consider critical points where the derivative is zero or undefined.

**Notes for generation:**
- Focus on finding intervals, not just single points.
- Vary the complexity of the function requiring differentiation.
- Ensure the inequality resulting from the derivative is solvable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q11`: The question requires finding the range of values for which a function is decreasing, which involves finding where the derivative is negative.
---
```

---

```markdown
## **M_c2a02791. Using Derived Information in a Second Problem**

**Core move:** Solve the first problem to find a parameter, then use that parameter to solve the second problem.

**Seen in / context:**
- Problems involving multiple steps where the result of the first step is essential for the second.
- Questions where a variable is calculated in the first part and then used in a subsequent calculation.
- Situations where a value derived from one equation is substituted into another.

**Possible wrong paths:**
- Forgetting to use the derived information in the second part of the problem.
- Incorrectly calculating the parameter in the first part, leading to a wrong answer in the second.
- Attempting to solve the second problem independently without using the result from the first.

**Notes for generation:**
- Create two related problems where the answer to the first is required to solve the second.
- Ensure the connection between the two problems is not immediately obvious.
- The parameter derived should be crucial for solving the second problem, not just a minor detail.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q12`: The question requires finding the value of 'n' in the first part and using it to calculate the probability in the second part.

---
```

---

```markdown
## **M_9be6c54d. Telescoping Sum of Integrals**

**Core move:** Express the sum of integrals with adjacent intervals as a single integral over the combined interval, simplifying the expression.

**Seen in / context:**
- Evaluating definite integrals of piecewise functions.
- Simplifying expressions involving sums of integrals with overlapping or adjacent limits.
- Problems where the integrand is the same, but the limits of integration vary systematically.

**Possible wrong paths:**
- Incorrectly applying the limits of integration when combining integrals.
- Attempting to evaluate each integral separately without recognizing the telescoping pattern.
- Misunderstanding the additivity property of definite integrals.

**Notes for generation:**
- Ensure the limits of integration are adjacent or overlapping to allow for combination.
- Consider using piecewise functions to create scenarios where this technique is applicable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q13`: The question requires combining multiple integrals into a single integral to simplify the calculation and find the area under the curve.

---
```

---

```markdown
## **M_66d70079. Equation Solving with Trigonometric Constraints**

**Core move:** Solve an equation by using the range of a trigonometric function to limit the possible solutions, then testing integer values within that range.

**Seen in / context:**
- Equations involving trigonometric functions like sine or cosine where the argument is a multiple of the variable.
- Problems where direct algebraic manipulation is difficult or leads to multiple solutions.
- Situations where the question implies integer solutions are expected.

**Possible wrong paths:**
- Attempting to solve the equation algebraically without considering the bounded range of trigonometric functions.
- Forgetting to test all integer values within the determined range.
- Incorrectly determining the range of the trigonometric function.

**Notes for generation:**
- Ensure the trigonometric function's argument includes a multiple of the variable (e.g., sin(2x), cos(3x)).
- The range restriction should significantly reduce the number of possible solutions.
- The problem should be solvable by testing integer values.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q14`: The range of the sine function is used to limit the possible integer values of 'n', which are then tested in the original equation to find valid solutions.

---
```

---

```markdown
## **M_3a446e21. Iterative Summation of Function Values**

**Core move:** Recognize and exploit the function's periodicity or iterative behavior to calculate the sum of its scaled values over a given range.

**Seen in / context:**
- Summing the values of a periodic function over multiple periods.
- Calculating the sum of a geometric series derived from function values.
- Problems involving iterative application of a function and summing the results.

**Possible wrong paths:**
- Attempting to directly compute each term in the sum without recognizing patterns.
- Incorrectly applying the formula for a geometric series.
- Ignoring the function's periodicity or symmetry.

**Notes for generation:**
- Ensure the function has a clear iterative or periodic property.
- Consider using geometric series or telescoping sums.
- Vary the scaling factor applied to the function values.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q15`: The problem involves summing a function's values over a range, where the function exhibits a pattern related to powers of a constant, requiring recognition of a geometric series.
---
```

---

```markdown
## **M_aba8c414. Ratio of Consecutive Terms in Binomial Expansion**

**Core move:** Form a ratio between consecutive terms in a binomial expansion to eliminate variables and solve for unknowns.

**Seen in / context:**
- Binomial expansions where a variable is unknown.
- Problems requiring solving for a variable within a binomial coefficient.
- Situations where direct calculation of binomial coefficients is cumbersome.

**Possible wrong paths:**
- Incorrectly calculating the ratio of consecutive binomial coefficients.
- Failing to simplify the ratio after forming it.
- Not recognizing the opportunity to eliminate variables through the ratio.

**Notes for generation:**
- Ensure the ratio simplifies to a solvable equation.
- Vary the unknown variable (e.g., exponent, coefficient).
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q16`: The ratio of consecutive terms allows for the elimination of factorials and simplification to solve for the unknown power *n*.
---
```

---

```markdown
## **M_888c95a2. Equation to Geometric Representation Analysis**

**Core move:** Transforming an equation into its corresponding geometric representation by understanding the equation's properties and relating them to visual features.

**Seen in / context:**
- Identifying the geometric shape (e.g., circle, parabola) represented by a given equation.
- Determining the equation of a geometric shape based on its visual characteristics.
- Relating algebraic parameters in an equation to geometric properties (e.g., radius, center, vertex).

**Possible wrong paths:**
- Misinterpreting the equation's form, leading to an incorrect geometric representation.
- Focusing solely on superficial features of the equation without considering underlying mathematical principles.
- Incorrectly applying geometric transformations to the equation or its representation.

**Notes for generation:**
- Focus on equations representing common geometric shapes.
- Vary the complexity of the equations and the level of detail required in the geometric representation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q17`: Recognizing that the given equation represents a circle and determining its radius by completing the square.
---
```

---

```markdown
## **M_6bcf3bf8. Transformation and Equation Derivation**

**Core move:** Apply a geometric transformation (rotation) to a given equation and derive the new equation representing the transformed curve.

**Seen in / context:**
- Questions involving rotations of conic sections or other curves.
- Problems where the original equation is given in terms of x and y, and the transformed equation needs to be found.
- Situations requiring substitution of transformed coordinates into the original equation.

**Possible wrong paths:**
- Incorrectly applying the rotation matrix or transformation equations.
- Making algebraic errors during the substitution and simplification process.
- Forgetting to express the final equation in terms of the new coordinates.

**Notes for generation:**
- Focus on rotations, but other transformations (translations, reflections, scalings) could be used.
- Ensure the algebraic manipulation required is of appropriate difficulty.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q18`: The question requires applying a rotation transformation to a given equation and finding the resulting equation. The core move is to correctly substitute the transformed coordinates into the original equation and simplify.

---
```

---

```markdown
## **M_d6f7ec41. Solving Trigonometric Equations with Range Constraints**

**Core move:** Solve a trigonometric equation to find solutions, then use the number of solutions within a specified interval to constrain a parameter.

**Seen in / context:**
- Problems involving trigonometric equations where the number of solutions within a given range is important.
- Questions requiring careful consideration of the periodicity of trigonometric functions.
- Problems where the range of a parameter affects the number of solutions.

**Possible wrong paths:**
- Incorrectly solving the trigonometric equation, leading to wrong solutions.
- Neglecting the periodicity of trigonometric functions, missing solutions.
- Misinterpreting the given interval, leading to an incorrect count of solutions.

**Notes for generation:**
- Vary the trigonometric equation (e.g., sine, cosine, tangent).
- Change the interval in which the solutions must lie.
- Vary the parameter that needs to be constrained.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q19`: The question requires solving a trigonometric equation, identifying solutions within a given range, and then determining the range of a parameter based on the number of solutions.

---
```

---

```markdown
## **M_e008727e. Simplification and Algebraic Manipulation**

**Core move:** Simplify the given equation using logarithmic properties and algebraic manipulations to find a relationship between x and y, then use that relationship to determine the length of the curve.

**Seen in / context:**
- Simplifying complex expressions involving logarithms.
- Manipulating equations to isolate variables or find relationships between them.
- Applying algebraic techniques to solve geometric problems.

**Possible wrong paths:**
- Incorrectly applying logarithmic properties (e.g., confusing log(a+b) with log(a) + log(b)).
- Making algebraic errors when manipulating the equation.
- Failing to recognize the geometric implications of the simplified equation.

**Notes for generation:**
- The core move should involve both logarithmic simplification and algebraic manipulation.
- The final answer should require geometric interpretation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2021_Q20`: The question requires simplifying a logarithmic equation, manipulating it algebraically to find a relationship between x and y, and then using that relationship to determine the length of a curve.

---
```

---

```markdown
## **M_33512c9a. Substitution and Equation Solving for Solutions**

**Core move:** Substitute a variable to transform the equation into a more manageable form (e.g., quadratic), solve for the substituted variable, and then solve for the original variable, considering the domain.

**Seen in / context:**
- Equations involving radicals or fractional powers.
- Equations with repeated composite functions.
- Equations where a substitution simplifies the algebraic structure.

**Possible wrong paths:**
- Forgetting to solve for the original variable after solving for the substituted variable.
- Not considering the domain of the original variable or the substituted variable.
- Making algebraic errors when substituting or simplifying.

**Notes for generation:**
- Ensure the substitution leads to a solvable equation.
- Vary the type of equation (polynomial, radical, trigonometric).
- Include domain restrictions to test understanding.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q3`: This question requires substituting $y=x^2$ to solve a quadratic in $x^2$, then solving for $x$ and considering the domain.
---
```

---

```markdown
## **M_9a2cb22b. Manipulate equation, parameters, constraints**

**Core move:** Transform an equation into a standard form to identify constraints on parameters based on conditions for a specific geometric shape (circle).

**Seen in / context:**
- Questions involving circles and their equations.
- Problems requiring the identification of parameter ranges for a circle to exist.
- Scenarios where completing the square is necessary to reveal the circle's center and radius.

**Possible wrong paths:**
- Incorrectly completing the square, leading to an inaccurate equation.
- Forgetting to consider the constraint that the radius squared must be positive.
- Misinterpreting the relationship between the parameters and the circle's properties.

**Notes for generation:**
- Focus on questions where students need to rearrange and complete the square.
- Vary the complexity of the algebraic manipulation required.
- Ensure the parameters have clear constraints based on geometric properties.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q4`: The question requires completing the square to find the radius squared and then setting up an inequality to ensure the radius is real.
---
```

---

```markdown
## **M_e221d015. Deduction from multiple constraints and equations**

**Core move:** Solve for an unknown by combining information from multiple given statements, including equations and function properties.

**Seen in / context:**
- Problems involving multiple equations with shared variables.
- Questions requiring the use of function properties (e.g., symmetry, periodicity) alongside equations.
- Situations where direct substitution is not immediately obvious, requiring manipulation of equations.
- Problems involving inequalities and equations simultaneously.

**Possible wrong paths:**
- Incorrectly manipulating equations, leading to algebraic errors.
- Overlooking crucial information or constraints provided in the problem statement.
- Making unwarranted assumptions about the properties of functions.
- Attempting to solve for each variable independently without considering the relationships between them.

**Notes for generation:**
- Ensure the problem requires combining at least two distinct pieces of information.
- The question should not be solvable by simple substitution or a single equation.
- Consider using function properties like f(x) = f(-x) or f(x+T) = f(x).
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q5`: This question requires combining the given equation with the property of the function to deduce the value of the expression.

---
```

---

```markdown
## **M_7850f89d. Ratio and Difference to Find Unknown**

**Core move:** Use ratios derived from similarity and a given difference to solve for an unknown quantity related to the perimeters.

**Seen in / context:**
- Problems involving similar shapes where the ratio of corresponding sides is known.
- Questions providing the difference between two related quantities (e.g., perimeters).
- Problems requiring the calculation of an unknown length or perimeter.

**Possible wrong paths:**
- Incorrectly setting up the ratio between corresponding sides.
- Failing to account for the difference when solving for the unknown quantity.
- Assuming the ratio of perimeters is the same as the ratio of areas.

**Notes for generation:**
- Ensure the ratio between the similar shapes is clearly defined or can be easily derived.
- The difference provided should be relevant to the unknown quantity being solved for.
- The unknown should be a length or perimeter related to the similar shapes.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q6`: The question provides the ratio of sides of similar shapes and the difference in their perimeters, requiring the calculation of a specific side length.

---
```

---

```markdown
## **M_b7761886. Solve Recurrence Relation with Given Values**

**Core move:** Determine the parameters of a recurrence relation by substituting given values and solving the resulting system of equations, then use the found parameters to find the next term in the sequence.

**Seen in / context:**
- Problems involving sequences defined by recurrence relations.
- Questions asking for a specific term in a sequence, given initial terms and a recurrence formula with unknown parameters.
- Situations where simultaneous equations need to be formed and solved to find the unknown parameters.

**Possible wrong paths:**
- Incorrectly substituting values into the recurrence relation.
- Making algebraic errors when solving the system of equations.
- Assuming a specific form for the recurrence relation without justification.

**Notes for generation:**
- Vary the type of recurrence relation (e.g., linear, quadratic).
- Change the number of initial values given.
- Vary the complexity of the algebra required to solve for the parameters.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q7`: Substituting the given values into the recurrence relation to form simultaneous equations, solving for the unknown coefficients, and then using the found recurrence relation to find the next term.

---
```

---

```markdown
## **M_caec881f. Algebraic Manipulation to Solve for Variable**

**Core move:** Manipulate an algebraic equation, often using logarithmic or exponential properties, to isolate a specific variable and determine its value.

**Seen in / context:**
- Equations involving exponents and logarithms.
- Problems requiring rearrangement of terms to isolate the target variable.
- Situations where the variable is embedded within a function (e.g., exponential, logarithmic).

**Possible wrong paths:**
- Incorrectly applying logarithmic or exponential rules.
- Failing to account for domain restrictions of logarithmic functions.
- Making algebraic errors during rearrangement.

**Notes for generation:**
- Involve equations where the variable is not easily isolated.
- Use logarithmic or exponential functions to obscure the variable.
- Ensure that the algebraic manipulation requires a specific order of operations.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q8`: The question requires manipulating an equation with exponents to solve for x, involving understanding of exponential rules and algebraic rearrangement.
---
```

---

```markdown
## **M_f050c10e. Area Calculation with Symmetry and Absolute Value**

**Core move:** Exploit symmetry to simplify the integral calculation after handling the absolute value function.

**Seen in / context:**
- Finding the area between a curve and the x-axis where the curve crosses the x-axis.
- Evaluating definite integrals involving absolute value functions.
- Problems where symmetry about the y-axis or origin can reduce calculation.

**Possible wrong paths:**
- Ignoring the absolute value and integrating directly, leading to incorrect area calculation.
- Not recognizing or utilizing symmetry to simplify the integral.
- Incorrectly splitting the integral at the points where the function inside the absolute value changes sign.

**Notes for generation:**
- Ensure the function inside the absolute value has easily identifiable roots.
- Design questions where symmetry significantly reduces the computational burden.
- The function should be integrable using standard techniques.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q9`: Recognising the symmetry of the function and splitting the integral at the point where the absolute value changes the sign allows for simplified calculation of the area.
---
```

---

```markdown
## **M_74bf12a4. Manipulating Geometric Series Sum Formula**

**Core move:** Expressing the difference of sums of geometric series in terms of a common factor involving another sum of the same series, and then simplifying to find a relationship between the common ratio and k.

**Seen in / context:**
- Problems involving sums of geometric series with a finite number of terms.
- Questions where a relationship between the common ratio and other variables needs to be determined.
- Situations where the difference of two geometric series sums can be factored.

**Possible wrong paths:**
- Incorrectly applying the formula for the sum of a geometric series.
- Failing to recognize the common factor in the difference of the sums.
- Algebraic errors when simplifying the expression.

**Notes for generation:**
- Focus on questions that require algebraic manipulation of the geometric series sum formula.
- Vary the number of terms in the series and the relationship to be found.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q10`: This question requires expressing the difference of two geometric series sums in terms of a common factor, and then simplifying to find a relationship between the common ratio and k.

---
```

---

```markdown
## **M_1185ecea. System of Equations to Minimum Value**

**Core move:** Solve a system of equations to express a function in a form suitable for finding its minimum value, potentially using trigonometric identities and completing the square.

**Seen in / context:**
- Finding the minimum value of a function involving trigonometric terms.
- Problems where direct substitution doesn't immediately reveal the minimum.
- Situations requiring manipulation of equations to reveal a squared term.

**Possible wrong paths:**
- Incorrectly applying trigonometric identities.
- Making algebraic errors when completing the square.
- Failing to recognize the minimum value after completing the square.

**Notes for generation:**
- Ensure the system of equations is solvable and leads to a unique minimum.
- Consider using trigonometric identities that students are likely to know.
- The function should be expressible in a form like (expression)^2 + constant.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q11`: The question requires solving a system of equations derived from trigonometric identities to find the minimum value of an expression.

---
```

---

```markdown
## **M_f8983a28. Polynomial Transformation Invariance Under Translation**

**Core move:** Recognize that horizontal/vertical translations of a polynomial do not alter its degree or leading coefficient, only affecting lower-order terms and the constant term.

**Seen in / context:**
- Problems involving transformations of polynomial functions.
- Questions asking for the degree of a transformed polynomial.
- Identifying coefficients after a translation.

**Possible wrong paths:**
- Assuming translations change the degree of the polynomial.
- Incorrectly expanding the translated polynomial.
- Ignoring the effect of the translation on the constant term.

**Notes for generation:**
- Focus on polynomial transformations, particularly translations.
- Ask about the degree or leading coefficient after translation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q12`: Recognizing that a horizontal translation does not change the degree of the polynomial, allowing for the determination of the original polynomial's degree based on the translated form.
- `TMUA_Paper1_2020_Q05`: Understanding that vertical translations do not affect the x-intercepts of a function.
- `TMUA_Paper1_2016_Q08`: Recognizing that horizontal translations do not change the y-intercepts of a function.

---
```

---

```markdown
## **M_a91b6fb3. Summation of Series with Logarithmic Terms**

**Core move:** Evaluate a summation by recognizing a pattern or telescoping series involving logarithmic terms, often requiring simplification of the logarithmic expression.

**Seen in / context:**
- Summation of series involving logarithms.
- Simplification of logarithmic expressions using properties of logarithms.
- Telescoping series where terms cancel out.

**Possible wrong paths:**
- Incorrectly applying logarithmic identities.
- Failing to recognize the telescoping nature of the series.
- Making algebraic errors when simplifying the logarithmic expression.

**Notes for generation:**
- Ensure the logarithmic terms simplify significantly when summed.
- The series should telescope, leading to a manageable expression.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q13`: The summation involves logarithms that can be simplified using logarithmic identities. The series telescopes, leaving only a few terms.

---
```

---

```markdown
## **M_44d1230d. Minimization by Parameter Elimination**

**Core move:** Find the minimum value of a function parameterized by k by eliminating k and finding the minimum of the resulting function.

**Seen in / context:**
- Functions with a parameter where the minimum value is sought.
- Optimization problems where eliminating a variable simplifies the objective function.
- Situations where direct differentiation is difficult or impossible.

**Possible wrong paths:**
- Differentiating the original function with respect to both the variable and the parameter, leading to a more complex problem.
- Incorrectly eliminating the parameter, leading to a function with a different minimum.
- Assuming the minimum occurs at a specific value of the parameter without justification.

**Notes for generation:**
- The function should be relatively simple to manipulate algebraically.
- The parameter elimination should lead to a simpler function to minimize.
- The question should require algebraic manipulation rather than calculus.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q14`: The question requires eliminating `k` to find the minimum value of the expression.

---
```

---

```markdown
## **M_95991a02. Equation Manipulation and Variable Isolation**

**Core move:** Isolate a target expression by manipulating an equation, then determine the minimum/maximum value of the isolated expression.

**Seen in / context:**
- Algebraic manipulation to rearrange equations.
- Finding minimum or maximum values of expressions.
- Problems involving constraints and optimization.

**Possible wrong paths:**
- Incorrect algebraic manipulation leading to a wrong expression.
- Failing to consider all possible values or constraints when finding the minimum/maximum.
- Assuming the minimum/maximum occurs at a specific, untested value.

**Notes for generation:**
- Ensure the equation can be manipulated to isolate the target expression.
- The isolated expression should be amenable to finding a minimum or maximum value (e.g., quadratic, absolute value).
- Consider adding constraints to the variables to make the problem more challenging.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q15`: Isolate 'ab' and then find the minimum value of the resulting expression, recognizing the square is always non-negative.

---
```

---

```markdown
## **M_f61b50bf. Optimization via Geometric Representation and Calculus**

**Core move:** Represent the problem geometrically, formulate an area function based on the geometric constraints, and then optimize this function using calculus.

**Seen in / context:**
- Problems involving maximizing or minimizing areas of geometric shapes.
- Questions where a geometric representation simplifies the problem.
- Optimization problems with constraints that can be expressed geometrically.

**Possible wrong paths:**
- Attempting to solve the problem algebraically without considering a geometric representation.
- Incorrectly formulating the area function.
- Errors in differentiation or optimization techniques.

**Notes for generation:**
- Questions should require both geometric insight and calculus skills.
- Vary the geometric shapes and constraints.
- Ensure the area function is non-trivial to derive.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q17`: The problem involves maximizing the area of a rectangle inscribed within a triangle, requiring a geometric representation and calculus to optimize the area function.

---
```

---

```markdown
## **M_31dee54c. Optimization with Geometric Constraints**

**Core move:** Maximize an area subject to geometric constraints by relating it to a variable angle, and then finding the angle that maximizes the area.

**Seen in / context:**
- Problems involving maximizing the area of a shape with fixed perimeter or side lengths.
- Situations where the area can be expressed as a trigonometric function of an angle.
- Geometric problems where a constraint can be expressed as a function of an angle.

**Possible wrong paths:**
- Assuming that a maximum area occurs with equal side lengths without proof.
- Failing to correctly express the area as a function of a single variable (angle).
- Incorrectly differentiating the area function or solving for the critical points.

**Notes for generation:**
- The angle should be a natural parameter to describe the configuration.
- The area function should be differentiable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q16`: Relates the area of a kite to a trigonometric function of an angle and then maximizes the area by finding the angle that maximizes the function.
- `TMUA_Paper1_2020_Q16`: Maximizing the area of a quadrilateral given constraints on side lengths by relating it to an angle.
- `TMUA_Paper1_2020_Q17`: Maximizing the area of a triangle given constraints on side lengths by relating it to an angle.

---
```

---

```markdown
## **M_c3bc9e3c. Transform Roots of Polynomial Equation**

**Core move:** Relate the roots of a given polynomial to the roots of a transformed polynomial by identifying a relationship between trigonometric identities and polynomial coefficients.

**Seen in / context:**
- Polynomial equations where roots are related by a trigonometric function.
- Problems requiring the application of trigonometric identities to polynomial roots.
- Questions involving Vieta's formulas and transformations of polynomial roots.

**Possible wrong paths:**
- Incorrectly applying trigonometric identities.
- Failing to relate the coefficients of the polynomial to the roots.
- Algebraic errors when manipulating polynomial expressions.

**Notes for generation:**
- Focus on trigonometric identities that relate angles (e.g., double angle, triple angle).
- Ensure the relationship between the roots is not immediately obvious.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2022_Q18`: Recognising the relationship between the roots of the polynomial and the cosine triple angle formula allows for the determination of the value of cos(θ).
---
```

---

```markdown
## **M_d08258f6. Geometric Constraints and Triangle Inequality**

**Core move:** Determine the range of possible side lengths by applying the triangle inequality theorem and geometric constraints to find the values of x that allow for two possible triangles.

**Seen in / context:**
- Problems involving side lengths of triangles.
- Questions requiring application of the triangle inequality theorem.
- Scenarios where geometric constraints limit possible solutions.

**Possible wrong paths:**
- Forgetting to consider all three inequalities from the triangle inequality theorem.
- Ignoring geometric constraints that further restrict the possible side lengths.
- Assuming only one triangle is possible without checking for alternative solutions.

**Notes for generation:**
- Ensure the geometric constraints are clearly defined.
- Vary the complexity of the algebraic manipulations required.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2022_Q19`: Applying the triangle inequality and the constraint that two distinct triangles are possible leads to a range of possible x values.

---
```

---

```markdown
## **M_e82e499e. Analyzing Function Intersections with Constraints**

**Core move:** Determining the conditions on parameters of functions to maximize the number of intersection points (solutions) given constraints on the parameters and the functions' forms.

**Seen in / context:**
- Maximizing the number of solutions to simultaneous equations by manipulating parameters.
- Finding the range of a parameter that yields a specific number of intersection points.
- Problems involving polynomial equations where the coefficients are constrained.

**Possible wrong paths:**
- Neglecting the constraints on the parameters when solving for the number of intersections.
- Assuming that all solutions found algebraically are valid within the given constraints.
- Focusing solely on algebraic manipulation without considering the geometric interpretation of intersections.

**Notes for generation:**
- Vary the types of functions (linear, quadratic, trigonometric).
- Include constraints on the parameters that require careful consideration.
- The core move should involve maximizing the number of intersection points.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q20`: This question requires finding the number of integer values of a parameter for which two functions intersect at two distinct points, demonstrating the core move of maximizing intersections under constraints.

---
```

---

```markdown
## **M_ccb4f89c. Geometric Probability with Area Comparison**

**Core move:** Calculate probability by comparing the area of a favorable region to the area of the total possible region, both defined geometrically.

**Seen in / context:**
- Probability problems involving geometric shapes.
- Probability problems where outcomes are uniformly distributed over an area.
- Calculating areas of regions defined by inequalities.

**Possible wrong paths:**
- Incorrectly calculating the area of the favorable or total region.
- Failing to account for constraints on the possible region.
- Confusing area with length or volume.

**Notes for generation:**
- Use familiar geometric shapes (squares, circles, triangles).
- Vary the complexity of defining the favorable region.
- Ensure the area calculations are tractable.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q21`: The probability is found by calculating the ratio of the area where the condition is met to the total area.

---
```

---

## **M_6611ad18. Casework with Geometric Interpretation and Elimination**

**Core move:** Analyze the problem by considering different cases based on a parameter, interpreting equations geometrically, and eliminating answer choices based on geometric constraints.

**Seen in / context:**
- Problems involving parameters that affect the nature of a solution.
- Questions where a geometric interpretation (e.g., intersections of curves) provides insight.
- Scenarios where the number of solutions must satisfy certain conditions.

**Possible wrong paths:**
- Not considering all possible cases for the parameter.
- Incorrectly interpreting the geometric representation of the equations.
- Failing to eliminate answer choices based on geometric impossibilities.

**Notes for generation:**
- Vary the parameter and the equations to change the number of cases.
- Use functions that are easy to visualize geometrically.
- Ensure that some answer choices are geometrically impossible for certain parameter values.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2022_Q22`: The question requires considering different cases for the parameter 'a' and interpreting the equations as intersections of graphs to eliminate answer choices.

---

```markdown
## **M_e519421f. Equating Integrals to Solve for Variables**

**Core move:** Use given equations involving definite integrals to form a system of equations and solve for the unknown variables.

**Seen in / context:**
- Problems involving multiple definite integrals with unknown variables.
- Questions where the integral's value is given in terms of the unknown variables.
- Situations requiring simultaneous equations to be solved.

**Possible wrong paths:**
- Incorrectly evaluating the definite integral.
- Making algebraic errors when solving the system of equations.
- Failing to recognize the need to form a system of equations.

**Notes for generation:**
- Ensure the resulting system of equations is solvable.
- Vary the complexity of the integrals.
- - From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q3`: The question provides two definite integrals equated to expressions involving unknown variables. The core move is to evaluate the integrals, form a system of equations, and solve for the unknowns.

---
```

---

```markdown
## **M_b3340a90. Quadratic Discriminant for No Intersection**

**Core move:** Equate two expressions, rearrange to a quadratic equation, and apply the discriminant condition (b^2 - 4ac < 0) to ensure no real roots, thus no intersection.

**Seen in / context:**
- Finding when a line and a curve do not intersect.
- Determining the range of a parameter for which a quadratic equation has no real solutions.
- Problems involving non-intersecting circles or other geometric shapes after algebraic manipulation.

**Possible wrong paths:**
- Using the discriminant condition for real or repeated roots (b^2 - 4ac >= 0) instead of no real roots.
- Incorrectly rearranging the equation into the standard quadratic form (ax^2 + bx + c = 0).
- Making algebraic errors when calculating the discriminant.

**Notes for generation:**
- The expressions being equated can be linear, quadratic, or other algebraic forms.
- The parameter can appear in any of the coefficients (a, b, or c) of the quadratic.
- Ensure the final answer requires solving an inequality.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q4`: This question requires equating the equations of a line and a circle, rearranging into a quadratic, and then applying the discriminant condition for no intersection to find the range of values for 'k'.

---
```

---

```markdown
## **M_e6c1f22a. Iterative Application of a Defined Function**

**Core move:** Apply a given functional relationship iteratively, using the result of one application as the input for the next, to simplify a complex expression.

**Seen in / context:**
- Repeatedly applying a recurrence relation to find a specific term.
- Iterating a function to observe convergence or divergence.
- Simplifying nested functions by working from the inside out.

**Possible wrong paths:**
- Stopping the iteration too early or too late.
- Making an algebraic error in the function application.
- Assuming a pattern that does not hold for all iterations.

**Notes for generation:**
- Use functions that are easy to evaluate but become complex after multiple iterations.
- Consider recurrence relations or nested function calls.
- For Paper 1 (M): "- From TMUA Paper 1 (Mathematical Knowledge)"

**Exemplar questions:**
- `TMUA_Paper1_2023_Q5`: The question requires repeatedly applying the given function f(x) to the initial value until a specific condition is met. The core move is to correctly iterate the function and track the results.

---
```

---

```markdown
## **M_2f3d0fc5. Recognizing and Applying a Known Series**

**Core move:** Recognize the given infinite sum as a variation of a known series (e.g., Taylor or Maclaurin series) and apply the known result or a manipulation of it to evaluate the sum.

**Seen in / context:**
- Infinite sums that resemble Taylor or Maclaurin series expansions.
- Sums involving factorials, powers, and trigonometric or exponential functions.
- Questions requiring manipulation of series to match a known form.

**Possible wrong paths:**
- Incorrectly identifying the underlying series.
- Making algebraic errors when manipulating the series.
- Failing to account for the interval of convergence of the series.

**Notes for generation:**
- Focus on series related to common Taylor/Maclaurin expansions (e.g., sin(x), cos(x), e^x).
- Vary the series by introducing constants or modifying the index.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q6`: The question requires recognizing the given sum as related to the Maclaurin series for e^x and then using this to find the value of A.

---
```

---

```markdown
## **M_59e04eb5. Optimization with Geometric Constraints and Substitution**

**Core move:** Express the target quantity (area, length, etc.) as a function of a single variable, incorporate geometric constraints to define the variable's range, and then optimize the function within that range.

**Seen in / context:**
- Problems involving maximizing or minimizing geometric quantities.
- Situations where a relationship between variables can be established using geometric properties (e.g., similar triangles, Pythagorean theorem).
- Problems requiring the application of constraints derived from geometric conditions.

**Possible wrong paths:**
- Failing to identify the relevant geometric constraints on the variable.
- Incorrectly expressing the target quantity in terms of the chosen variable.
- Not considering the domain of the variable when optimizing the function.

**Notes for generation:**
- The geometric constraints should be non-trivial and require some geometric insight to identify.
- The function to be optimized should be relatively simple (e.g., quadratic) to allow for straightforward optimization.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q7`: The area of the triangle is expressed as a function of a single variable, and the maximum area is found using knowledge of quadratic functions.

---
```

---

```markdown
## **M_973694ca. Divisibility Test via Binomial Expansion**

**Core move:** Determine divisibility of a number by expanding it using the binomial theorem and checking the divisibility of individual terms.

**Seen in / context:**
- Numbers expressed as a sum of powers.
- Divisibility questions involving large numbers.
- Problems where binomial expansion simplifies the expression.

**Possible wrong paths:**
- Incorrectly applying the binomial theorem.
- Failing to account for all terms in the expansion.
- Not recognizing the divisibility properties of binomial coefficients.

**Notes for generation:**
- Focus on numbers that can be expressed as (a+b)^n.
- Vary the complexity of the binomial expansion required.
- Ensure the divisibility test is not immediately obvious.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q8`: Expanding (3+1)^5 and checking divisibility of individual terms by 8.
---
```

---

```markdown
## **M_9064286f. Ratio and Equation Solving with Simplification**

**Core move:** Set up a ratio equation, simplify expressions by factoring or expanding, and solve for the unknown variable.

**Seen in / context:**
- Problems involving proportional relationships between quantities.
- Equations with fractions or algebraic expressions that require simplification.
- Finding unknown values in geometric or algebraic contexts using ratios.

**Possible wrong paths:**
- Incorrectly setting up the initial ratio equation.
- Making algebraic errors during simplification (e.g., incorrect factoring or expanding).
- Failing to consider all possible solutions or extraneous roots.

**Notes for generation:**
- Ensure the simplification step is non-trivial and requires algebraic manipulation.
- Vary the context of the problem (e.g., geometric, algebraic, word problem).
- Include potential distractors based on common algebraic errors.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q9`: This question requires setting up a ratio based on the given information, simplifying the resulting equation, and solving for the unknown variable *x*. The simplification involves algebraic manipulation to isolate *x*.
---
```

---

```markdown
## **M_1beede3e. Ratio of Areas via Geometric Relationships**

**Core move:** Relate the ratio of areas to the ratio of trigonometric functions or side lengths derived from geometric constraints.

**Seen in / context:**
- Area ratios in triangles sharing a height.
- Area ratios in similar figures.
- Using trigonometric relationships (sine rule, cosine rule) to find side length ratios.
- Relating areas to products of sides and angles.

**Possible wrong paths:**
- Assuming area ratios directly correspond to side length ratios without considering height or angles.
- Incorrectly applying trigonometric identities.
- Forgetting to square side length ratios when dealing with area ratios of similar figures.
- Not considering shared heights or bases when calculating area ratios.

**Notes for generation:**
- Focus on geometric figures where area ratios can be expressed in terms of side lengths or trigonometric functions.
- Include geometric constraints that allow for the derivation of side length or angle ratios.
- Ensure the geometric figure is not easily solvable by direct area calculation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q10`: The ratio of the areas of two triangles can be found by relating the sides using the sine rule and then substituting into the area formula (1/2)absinC.

---
```

---

```markdown
## **M_cf3cc970. Solve equation and count solutions**

**Core move:** Solve the given equation for the variable, then count the number of solutions that fall within the specified interval.

**Seen in / context:**
- Equations involving trigonometric functions.
- Equations involving inequalities.
- Counting integer solutions within a range.

**Possible wrong paths:**
- Forgetting to consider the interval when counting solutions.
- Incorrectly solving the equation, leading to wrong solutions.
- Double-counting solutions or missing solutions due to algebraic errors.

**Notes for generation:**
- Vary the type of equation (trigonometric, polynomial, etc.).
- Vary the complexity of the interval.
- Ensure the equation has a finite number of solutions within the interval.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q11`: Solve the trigonometric equation and count the number of solutions in the given interval.

---
```

---

```markdown
## **M_b9bee3e8. Approximate, Calculate, and Compare Values**

**Core move:** Approximate a value using a given method, calculate the exact value, and then determine the difference between the two.

**Seen in / context:**
- Questions requiring estimation followed by precise calculation.
- Problems involving iterative approximation techniques.
- Scenarios where the error between an approximation and the true value needs to be quantified.

**Possible wrong paths:**
- Prematurely rounding intermediate values, leading to a larger final error.
- Incorrectly applying the approximation method.
- Miscalculating the exact value due to algebraic or arithmetic errors.

**Notes for generation:**
- Ensure the approximation method is clearly defined.
- The exact value should be calculable within a reasonable timeframe.
- Vary the complexity of the approximation and calculation steps.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q12`: The question explicitly asks for an approximation, then the exact value, and finally the difference.

---
```

---

```markdown
## **M_93d476e7. Equating Minimum Points of Transformed Functions**

**Core move:** Find the x-coordinate of the minimum point of two transformed functions, then equate these x-coordinates to find a relationship between the transformation parameters.

**Seen in / context:**
- Problems involving transformations of functions, such as translations or stretches.
- Questions asking for relationships between transformation parameters given a condition on minimum points.
- When the minimum point of a transformed function can be found by considering the effect of the transformation on the original minimum point.

**Possible wrong paths:**
- Incorrectly applying the transformations to the function, leading to an incorrect minimum point.
- Focusing on the y-coordinate of the minimum point instead of the x-coordinate.
- Not considering the effect of all transformations on the location of the minimum.

**Notes for generation:**
- Use transformations such as $f(x+a)$ or $bf(x)$.
- Ensure the original function has a clearly defined minimum point.
- The question should ask for a relationship between the parameters of the transformations.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q13`: The question requires finding the minimum point of two transformed functions and equating their x-coordinates to find a relationship between the transformation parameters.

---
```

---

```markdown
## **M_6c2926fe. Equation Solving by Graphing and Intersection**

**Core move:** Solve an equation by graphing both sides separately and finding the x-coordinates of the intersection points within a specified interval.

**Seen in / context:**
- Solving equations where algebraic manipulation is difficult or impossible.
- Finding the number of solutions to an equation within a given range.
- Problems involving trigonometric functions and their intersections.

**Possible wrong paths:**
- Only finding some of the intersection points within the interval.
- Incorrectly graphing one or both sides of the equation.
- Forgetting to consider the specified interval.

**Notes for generation:**
- Equations should be chosen such that graphing is a viable solution method.
- The interval should be clearly specified.
- Ensure the number of intersection points is countable within the given interval.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q14`: The question requires finding the number of solutions by graphing two functions and counting the intersections within a specified interval.

---
```

---

```markdown
## **M_00a271d9. Maximizing Distance Between Two Circles**

**Core move:** The maximum distance between two points on separate circles occurs when the points lie on the line connecting the centers of the circles, at the furthest points from each other.

**Seen in / context:**
- Finding the greatest distance between any two points on two separate circles.
- Problems involving maximizing a distance where the points are constrained to lie on circles.
- Geometry problems where the optimal solution lies along a line of symmetry or connection.

**Possible wrong paths:**
- Assuming the maximum distance occurs between arbitrary points on the circles.
- Calculating the distance between the centers of the circles and assuming this is related to the maximum distance.
- Forgetting to add the radii of both circles to the distance between the centers.

**Notes for generation:**
- Vary the position and size of the circles.
- Ask for the maximum distance directly or indirectly (e.g., "smallest possible value of k such that...").
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q15`: The maximum distance is achieved along the line connecting the centers, so the distance between the centers plus both radii gives the maximum distance.

---
```

---

```markdown
## **M_facb3ae3. Relating Function Roots to Parameter Range**

**Core move:** Determine the range of a parameter by analyzing the conditions for the existence of distinct real roots of a function, often involving finding critical points and using inequalities.

**Seen in / context:**
- Problems involving polynomials where the number of real roots depends on a parameter.
- Questions requiring the application of the discriminant to determine the nature of roots.
- Scenarios where the sign of a quadratic or cubic function at specific points dictates root behavior.

**Possible wrong paths:**
- Incorrectly applying the discriminant conditions (e.g., using > instead of ≥).
- Failing to consider the behavior of the function as x approaches ±∞.
- Not accounting for repeated roots when distinct roots are required.

**Notes for generation:**
- Focus on polynomials (quadratic, cubic) with a parameter affecting the coefficients.
- Vary the conditions for the roots (e.g., "exactly two distinct real roots," "at least one real root").
- The core move should be necessary to solve the problem; direct substitution should not be sufficient.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q16`: The question requires finding the range of a parameter for which a cubic equation has three distinct real roots, necessitating analysis of critical points and inequalities.

---
```

---

```markdown
## **M_4b5a0701. Relating Range to Parameter Value**

**Core move:** Use the known range (maximum - minimum) of a function to deduce constraints on the possible values of a parameter within that function.

**Seen in / context:**
- Problems where the range of a function is given.
- Finding the possible values or range of a parameter within a function.
- Questions involving trigonometric functions, exponentials, or other functions with known bounds.

**Possible wrong paths:**
- Ignoring the bounds of the function when solving for the parameter.
- Assuming the function achieves its maximum or minimum value for all possible parameter values.
- Incorrectly manipulating inequalities when solving for the parameter.

**Notes for generation:**
- Ensure the function's range is directly related to the parameter being solved for.
- The function should have a known maximum and/or minimum value.
- Consider using trigonometric functions or exponentials.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q17`: The range of the function limits the possible values of the parameter 'k'. By considering the maximum and minimum values of the function, we can derive an inequality that constrains 'k'.

---
```

---

```markdown
## **M_206e57ff. Case-Based Geometric Condition Checking**

**Core move:** Consider all possible cases where a geometric condition holds and solve for the unknown in each case, then combine the results.

**Seen in / context:**
- Problems involving geometric figures where a specific condition (e.g., right angle, parallel lines) is not explicitly given but could exist in multiple configurations.
- Questions requiring consideration of different orientations or arrangements of geometric elements.
- Problems where the solution depends on identifying all valid geometric cases.
- Geometric problems with a degree of freedom that allows for multiple valid configurations.

**Possible wrong paths:**
- Assuming a specific configuration without considering other possibilities.
- Overlooking a valid case that satisfies the given geometric condition.
- Incorrectly calculating the solution for a specific case.
- Failing to combine the results from all valid cases.

**Notes for generation:**
- Ensure multiple valid geometric configurations are possible.
- The geometric condition should be a key element for determining the solution.
- The solution should require combining results from multiple cases.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q18`: The question requires considering different possible locations for point $X$ and calculating the area in each case, then summing the results.

---
```

---

```markdown
## **M_7565da80. Iterative Pattern Recognition and Summation**

**Core move:** Identify a repeating pattern in a sequence of operations and sum the results of applying the pattern multiple times.

**Seen in / context:**
- Sequences involving cyclical behavior.
- Problems where a process repeats and the results accumulate.
- Summing the results of modular arithmetic operations.

**Possible wrong paths:**
- Failing to recognize the repeating pattern.
- Incorrectly calculating the sum of the repeating pattern.
- Assuming the pattern continues indefinitely when it does not.

**Notes for generation:**
- Create questions with a clear, repeating pattern.
- Ensure the pattern repeats at least 3 times to be obvious.
- The pattern should involve a simple arithmetic operation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q19`: Recognizing the cyclical pattern of remainders when dividing powers of 7 by 5 and summing the remainders over a given range.

---
```

---

```markdown
## **M_7f465b7a. Summation Convergence Based on Parameter Range**

**Core move:** Determine the range of a parameter for which an infinite sum converges to a value greater than a specified threshold, given a uniform probability distribution over possible parameter values.

**Seen in / context:**
- Infinite series convergence problems.
- Problems involving inequalities and parameter ranges.
- Questions requiring probabilistic reasoning with uniform distributions.

**Possible wrong paths:**
- Incorrectly applying convergence tests (e.g., ratio test, comparison test).
- Neglecting to consider the bounds of the parameter range.
- Misinterpreting the condition for the sum exceeding the threshold.

**Notes for generation:**
- Vary the infinite series (geometric, telescoping, etc.).
- Adjust the threshold value and the parameter's uniform distribution range.
- Ensure the parameter affects the convergence of the series.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q20`: Correctly identifies the parameter range for convergence above the threshold by manipulating the geometric series and solving the resulting inequality.

---
```

---

```markdown
## **M_e7baee6c. Solving Differential Equation by Inspection**

**Core move:** Recognize the function whose derivative matches the given expression, potentially involving absolute values or piecewise definitions.

**Seen in / context:**
- Differential equations where the solution can be directly inferred.
- Problems involving derivatives of absolute value functions.
- Situations requiring consideration of piecewise-defined functions.

**Possible wrong paths:**
- Incorrectly integrating the expression without considering constants of integration.
- Forgetting the absolute value when integrating functions of the form 1/x.
- Not considering different cases for piecewise functions.

**Notes for generation:**
- Include functions with absolute values or piecewise definitions.
- Focus on problems where a direct application of integration is not immediately obvious.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q21`: Recognizing that the derivative involves an absolute value, requiring careful consideration of the sign of the expression inside the absolute value.
---
```

---

```markdown
## **M_e378b1aa. Extrema of Transformed Function**

**Core move:** Find the extrema of the original function and use them to determine the extrema of the transformed function.

**Seen in / context:**
- Finding the maximum or minimum value of a function after a transformation.
- Problems involving absolute value functions.
- Questions where the transformation affects the location or value of the extrema.

**Possible wrong paths:**
- Assuming the transformation doesn't affect the location of the extrema.
- Incorrectly applying the transformation to the extrema.
- Forgetting to consider the effect of absolute values on minimum values.

**Notes for generation:**
- Use transformations such as absolute value, squaring, or addition/multiplication by a constant.
- Ensure the original function has easily identifiable extrema.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_2023_Q22`: The question requires finding the minimum value of |f(x)| given the minimum value of f(x).
---
```

---

```markdown
## **M_558e7e1e. Polynomial Expansion and Coefficient Matching**

**Core move:** Equate coefficients of corresponding terms in two equivalent polynomial expressions to solve for unknown variables.

**Seen in / context:**
- Solving for unknown coefficients in polynomial identities.
- Finding relationships between coefficients when polynomials are equal.
- Determining values that make two polynomial expressions identical.

**Possible wrong paths:**
- Incorrectly expanding polynomial expressions, leading to mismatched terms.
- Forgetting to equate coefficients of *all* corresponding terms.
- Attempting to solve for variables without fully expanding and simplifying.

**Notes for generation:**
- Ensure the polynomial expressions are of manageable complexity.
- The core move should be essential to solving the problem.
- The question should require careful algebraic manipulation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q3`: Expanding the given expression and equating the coefficients of x^2 and x allows us to solve for the unknowns p and q.
- `TMUA_Paper1_None_Q15`: Expanding (x+1)^5 and comparing coefficients to the given polynomial allows for the determination of a, b, c, d, and e.
- `TMUA_Paper1_None_Q18`: Expanding the product of the two quadratics and matching coefficients with the given quartic allows for the determination of the unknowns.

---
```

---

```markdown
## **M_376ba8fb. Substitution and Simplification in Equations**

**Core move:** Substitute given values into an equation and simplify the resulting expression to solve for an unknown variable or evaluate a target expression.

**Seen in / context:**
- Solving for a variable after substituting known values.
- Evaluating an expression after substituting known values.
- Simplifying expressions involving algebraic manipulation after substitution.

**Possible wrong paths:**
- Incorrectly substituting values into the equation.
- Making algebraic errors during simplification.
- Misinterpreting the order of operations.

**Notes for generation:**
- Ensure the substitution leads to a solvable or simplifiable expression.
- Vary the complexity of the equation and the required algebraic manipulation.
- Include potential for arithmetic errors to create wrong answer choices.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q4`: Substituting the given value of $x$ into the equation and simplifying to find the value of $y$.

---
```

---

```markdown
## **M_bd4f153c. Area Calculation with Absolute Value**

**Core move:** Calculate the definite integral of a function, taking the absolute value of the integral over intervals where the function is negative to find the total area enclosed.

**Seen in / context:**
- Finding the area between a curve and the x-axis where the function crosses the x-axis.
- Evaluating definite integrals where the integrand changes sign within the interval.
- Problems involving piecewise functions where different parts of the function are positive or negative.

**Possible wrong paths:**
- Ignoring the absolute value and directly integrating over the entire interval, leading to cancellation of areas.
- Incorrectly identifying the intervals where the function is positive or negative.
- Forgetting to split the integral into multiple integrals based on the function's sign.

**Notes for generation:**
- Include functions that are both positive and negative over the interval of integration.
- Consider using trigonometric functions or polynomials with multiple roots.
- The question should explicitly ask for the "area" rather than just the "value of the integral".
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q5`: The question requires splitting the integral into intervals where the function is positive and negative, and then taking the absolute value of the integral over the negative intervals before summing.

---
```

---

```markdown
## **M_b8427b06. Solve Trigonometric Equation with Range Restriction**

**Core move:** Solve the trigonometric equation and find the solutions within the given range.

**Seen in / context:**
- Solving trigonometric equations involving sine, cosine, or tangent.
- Determining the general solution of a trigonometric equation.
- Applying range restrictions to find specific solutions.
- Problems requiring knowledge of trigonometric identities.

**Possible wrong paths:**
- Forgetting to consider all possible solutions within the given range.
- Incorrectly applying trigonometric identities.
- Making algebraic errors while solving the equation.
- Not converting the range to the appropriate units (e.g., radians vs. degrees).

**Notes for generation:**
- Vary the trigonometric function used (sin, cos, tan, etc.).
- Vary the range restriction to include different intervals.
- Include trigonometric identities to increase complexity.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q6`: The question requires solving a trigonometric equation and selecting the solutions that fall within the specified range.

---
```

---

## **M_62e69776. Equation Transformation and Geometric Interpretation**

**Core move:** Manipulate an equation algebraically and relate the result to the geometric properties of a circle to determine the correct equation form based on given constraints.

**Seen in / context:**
- Problems involving equations that can be rearranged into the standard form of a circle.
- Questions where the radius or center of the circle must satisfy specific conditions.
- Problems requiring algebraic manipulation to reveal the geometric interpretation of an equation.

**Possible wrong paths:**
- Incorrectly expanding or simplifying algebraic expressions.
- Misinterpreting the standard form of a circle's equation.
- Neglecting to consider the constraints on the radius (e.g., radius must be positive).

**Notes for generation:**
- Ensure the equation can be transformed into the standard form of a circle.
- Vary the constraints on the circle's radius or center (e.g., lying on a specific line).
- Include algebraic manipulations that are prone to common errors.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q7`: The question requires completing the square to find the equation of a circle and then using the condition on the radius to solve for an unknown parameter.

---

```markdown
## **M_a9cacc43. Solve Exponential Equation and Compare Solutions**

**Core move:** Solve the given exponential equation for the unknown variable, then compare the two solutions p and q to determine the value of p-q.

**Seen in / context:**
- Solving exponential equations where the variable is in the exponent.
- Finding multiple solutions to an equation.
- Comparing and manipulating algebraic expressions.

**Possible wrong paths:**
- Incorrectly applying logarithm rules.
- Only finding one solution to the exponential equation.
- Making algebraic errors when simplifying or rearranging the equation.

**Notes for generation:**
- Vary the complexity of the exponential equation.
- Ensure the equation has two distinct solutions.
- The final comparison (p-q) should require careful attention to signs.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q8`: Solving the exponential equation 3^(2x+2) + 8(3^x) - 1 = 0 and then calculating p-q, where p and q are the solutions.
---
```

---

```markdown
## **M_061a795b. Comparing and contrasting different scenarios**

**Core move:** Evaluate and contrast different possible outcomes or conditions within a given scenario to determine the most likely or correct answer.

**Seen in / context:**
- Questions presenting multiple possible scenarios based on different conditions.
- Problems requiring comparison of probabilities or expected values under varying circumstances.
- Scenarios involving "what if" analysis to assess the impact of changing variables.

**Possible wrong paths:**
- Focusing on only one possible scenario and ignoring others.
- Incorrectly calculating probabilities or expected values for each scenario.
- Failing to account for all relevant conditions or constraints.

**Notes for generation:**
- Present a clear scenario with multiple possible outcomes or conditions.
- Require examinees to compare and contrast these possibilities.
- Ensure that incorrect options represent common errors in reasoning or calculation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q9`: The question presents a scenario with different possible outcomes based on the value of 'x' and requires comparing the probabilities of these outcomes.

---
```

---

```markdown
## **M_e5af4369. Solving Polynomial by Testing Possible Roots**

**Core move:** Test each of the possible roots provided in the options to see which one(s) satisfy the polynomial equation.

**Seen in / context:**
- When the question asks for roots of a polynomial.
- When the options provide a limited set of possible roots.
- When direct algebraic manipulation is difficult or time-consuming.

**Possible wrong paths:**
- Attempting to factor the polynomial directly without testing roots.
- Incorrectly substituting the possible roots into the polynomial.
- Assuming that only one of the provided options can be a root.

**Notes for generation:**
- Ensure the polynomial is of a degree that makes direct factorization difficult.
- Provide a set of possible roots in the options.
- Include options that are close to being roots but do not satisfy the equation.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q10`: Substitute each of the given values for *x* into the polynomial to see if the equation holds true.

---
```

---

```markdown
## **M_3d829f8d. Solve equation with given condition**

**Core move:** Substitute the given value into the equation and solve for the unknown parameter, then solve another equation.

**Seen in / context:**
- Solving algebraic equations where a condition is given.
- Finding the value of a parameter that satisfies a given equation.
- Solving simultaneous equations after substitution.

**Possible wrong paths:**
- Incorrectly substituting the given value.
- Making algebraic errors when solving for the unknown parameter.
- Forgetting to solve the second equation after finding the parameter.

**Notes for generation:**
- Vary the type of equations (linear, quadratic, etc.).
- Vary the complexity of the substitution.
- Ensure the second equation is solvable after finding the parameter.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q11`: Substitute x=2 into the equation, solve for k, and then solve the resulting quadratic equation.
```

---

```markdown
## **M_089d2d95. Solve Inequality with Multiple Conditions**

**Core move:** Solve an inequality or a system of inequalities, potentially with multiple conditions or constraints on the variable.

**Seen in / context:**
- Solving inequalities involving algebraic expressions.
- Determining the range of values that satisfy multiple inequalities simultaneously.
- Problems where the solution must satisfy additional constraints (e.g., integer solutions).

**Possible wrong paths:**
- Incorrectly applying algebraic operations that change the direction of the inequality.
- Forgetting to consider all conditions or constraints when determining the final solution set.
- Making sign errors when manipulating inequalities.

**Notes for generation:**
- Include inequalities that require multiple steps to solve.
- Add constraints such as "x must be an integer" or "x must be positive".
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q12`: The question requires solving an inequality with multiple conditions to find the range of possible values for x.
---
```

---

```markdown
## **M_1f624281. Coefficient Matching and Equation Solving**

**Core move:** Equate coefficients of like terms in a polynomial expansion to create an equation, then solve for the unknown variable.

**Seen in / context:**
- Polynomial expansions where a specific coefficient is required.
- Finding unknown parameters within a polynomial expression.
- Problems involving binomial theorem expansions.

**Possible wrong paths:**
- Incorrectly expanding the polynomial.
- Equating coefficients of unlike terms.
- Making algebraic errors when solving the resulting equation.

**Notes for generation:**
- Ensure the polynomial expansion is non-trivial.
- The equation resulting from coefficient matching should require algebraic manipulation to solve.
- Consider using binomial coefficients or other polynomial identities.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q13`: The question requires expanding a binomial expression, equating the coefficient of x^2, and solving the resulting quadratic equation for k.
---
```

---

```markdown
## **M_20f17d2c. Eliminating options based on magnitude estimation**

**Core move:** Approximate the value of an expression and eliminate answer choices that are clearly outside of the estimated range.

**Seen in / context:**
- Questions involving complex calculations where exact computation is time-consuming.
- Questions with answer choices that span a wide range of values.
- Questions where a rough estimate is sufficient to narrow down the possibilities.
- Questions involving logarithms, exponentials, or trigonometric functions.

**Possible wrong paths:**
- Attempting to calculate the exact value without considering estimation.
- Making inaccurate estimations due to poor understanding of magnitude.
- Disregarding the units or scale of the answer choices.
- Overlooking the possibility of multiple answer choices falling within the estimated range.

**Notes for generation:**
- Include answer choices that are significantly different in magnitude.
- Design questions where exact calculation is difficult or time-consuming.
- Ensure that a reasonable estimation can narrow down the options to one or two.
- From TMUA Paper 1 (Mathematical Knowledge)

**Exemplar questions:**
- `TMUA_Paper1_None_Q14`: Approximate the value of the logarithmic expression to eliminate options that are clearly too large or too small.

---
```

---

```markdown
## **M_9f3fba7a. Differentiating a function and matching the derivative**

**Core move:** Differentiate the given function y with respect to x, and then match the resulting expression for dy/dx with one of the provided options.

**Seen in / context:**
- Questions requiring differentiation of standard functions.
- Questions where the derivative needs simplification to match a given form.
- Questions involving implicit differentiation (though not the primary focus here).

**Possible wrong paths:**
- Incorrectly applying the chain rule or product rule.
- Making algebraic errors during simplification of the derivative.
- Failing to recognize equivalent forms of the derivative.

**Notes for generation:**
- Vary the complexity of the function to be differentiated (polynomial, trigonometric, exponential, logarithmic).
- Include functions that require the chain rule, product rule, or quotient rule.
- Ensure the correct answer requires some simplification to match one of the options.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q1`: Differentiating the given function y with respect to x requires careful application of the chain rule and simplification to match one of the answer options.
---
```

---

```markdown
## **M_fde11a80. Geometric Calculation with Derived Properties**

**Core move:** Calculate a geometric property (area) by first determining intermediate values (coordinates, lengths, slopes) derived from given relationships and constraints.

**Seen in / context:**
- Problems involving geometric figures where direct calculation is not immediately obvious.
- Questions requiring the use of simultaneous equations to find unknown lengths or coordinates.
- Scenarios where geometric properties are defined implicitly through relationships with other elements.

**Possible wrong paths:**
- Assuming geometric relationships without proof (e.g., assuming a quadrilateral is a parallelogram).
- Incorrectly setting up or solving simultaneous equations.
- Focusing on a single property without considering the interdependencies of geometric elements.

**Notes for generation:**
- The core move should involve calculating an area or other geometric property.
- The problem should require deriving intermediate values (lengths, coordinates, angles) before the final calculation.
- Ensure that the relationships and constraints are clearly defined.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q2`: The question requires finding the area of a triangle. However, to do so, one must first determine the coordinates of the vertices by solving simultaneous equations derived from the given geometric constraints (midpoints, line equations).

---
```

---

```markdown
## **M_f47235e1. Solve for Unknowns in Geometric Progression**

**Core move:** Use given terms of a geometric progression to determine the common ratio and first term, then use these to calculate a desired quantity (e.g., sum to infinity).

**Seen in / context:**
- Finding the sum to infinity of a geometric series given two terms.
- Determining the first term and common ratio from given terms.
- Calculating a specific term in the sequence after finding the first term and common ratio.

**Possible wrong paths:**
- Incorrectly setting up the equations based on the given terms (e.g., misunderstanding the relationship between terms in a geometric progression).
- Making algebraic errors when solving for the first term and common ratio.
- Forgetting to check if |r| < 1 when calculating the sum to infinity.

**Notes for generation:**
- Vary the information given (e.g., give the sum of the first n terms instead of specific terms).
- Ask for different quantities (e.g., the value of n for which the nth term is a certain value).
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q3`: The question requires finding the sum to infinity of a geometric series, given two terms of the series. This involves finding the first term and common ratio.

---
```

---

```markdown
## **M_5619a23e. Incomplete Solution: Missing Periodic Solutions**

**Core move:** The solution only considers one solution to a trigonometric equation, neglecting the periodic nature and other possible solutions.

**Seen in / context:**
- Solving trigonometric equations.
- Problems involving trigonometric functions where multiple solutions are possible.
- Questions requiring a general solution for trigonometric equations.

**Possible wrong paths:**
- Only finding the principal solution within a limited range (e.g., 0 to 90 degrees).
- Forgetting to add the period (2π or 360°) multiplied by an integer to the solution.
- Incorrectly applying trigonometric identities, leading to a loss of solutions.

**Notes for generation:**
- Create questions where multiple solutions exist for a trigonometric equation.
- Ensure the correct answer requires considering the periodic nature of trigonometric functions.
- Include answer choices that represent only the principal solution or solutions within a limited range.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q4`: The question requires finding all possible values of an angle that satisfy a given trigonometric equation, and the most common mistake is to only find one of the possible solutions.

---
```

---

```markdown
## **M_11ea9f26. Counterexample Identification in Logical Statements**

**Core move:** Identify a specific instance that violates the general claim made by a statement, thereby disproving it.

**Seen in / context:**
- Disproving universally quantified statements.
- Evaluating the validity of logical arguments.
- Identifying flaws in mathematical proofs.
- Assessing the truth of mathematical conjectures.

**Possible wrong paths:**
- Assuming a statement is true based on limited examples.
- Failing to consider edge cases or extreme values.
- Misinterpreting the scope of a quantifier.
- Attempting to prove a statement true instead of seeking a counterexample.

**Notes for generation:**
- Focus on statements that are false but appear plausible at first glance.
- Use mathematical concepts where counterexamples are not immediately obvious.
- Vary the complexity of the mathematical concepts involved.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q5`: The correct answer requires recognizing that the statement "n^2 + n + 41 is prime for all positive integers n" is false, and finding a specific value of n (e.g., n=41) that demonstrates this.

---
```

---

```markdown
## **M_361404af. Iterative Calculation with Recursive Definition**

**Core move:** Iteratively apply a recursive definition to compute a specific term or identify a pattern in a sequence.

**Seen in / context:**
- Problems involving sequences defined by recurrence relations.
- Questions asking for a specific term far along in a recursively defined sequence.
- Situations where direct calculation is tedious, suggesting a pattern or simplification.

**Possible wrong paths:**
- Incorrectly applying the recursive definition, leading to calculation errors.
- Assuming a pattern too early without sufficient evidence.
- Attempting to find a closed-form expression without first exploring the sequence iteratively.

**Notes for generation:**
- Focus on sequences defined by recurrence relations.
- Ensure iterative calculation is necessary to find the answer.
- Consider including a large index to discourage direct computation and encourage pattern recognition.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q6`: The question requires iteratively applying the recursive definition to find a pattern in the sequence and then calculating the desired term.

---
```

---

```markdown
## **M_0e67b8fd. Comparing Functions with Parameter Variation**

**Core move:** Analyze how changing a parameter within a function alters its behavior or graph, and compare this altered function to another function.

**Seen in / context:**
- Questions involving transformations of functions based on parameter changes (e.g., scaling, shifting).
- Problems where understanding the impact of a parameter on roots, asymptotes, or extrema is crucial.
- Scenarios requiring comparison of two functions, where one or both involve parameter variations.

**Possible wrong paths:**
- Incorrectly assuming a linear relationship between parameter change and function behavior.
- Neglecting the domain or range restrictions when parameters are varied.
- Focusing solely on algebraic manipulation without considering the graphical implications.

**Notes for generation:**
- Vary parameters within functions (e.g., coefficients, exponents, constants).
- Ask questions that require comparing the transformed function to a reference function.
- Focus on reasoning about the *effect* of the parameter change, not just calculating the new function.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q7`: Requires understanding how changing parameters in a function affects its roots and comparing it to another function's roots.

---
```

---

```markdown
## **M_025e04b1. Comparing Values by Simplification and Approximation**

**Core move:** Simplify or approximate each option to a comparable numerical value to determine the smallest.

**Seen in / context:**
- Comparing values of expressions involving roots, exponents, or logarithms.
- Determining the smallest value from a set of options.
- Questions where direct calculation is difficult or time-consuming.

**Possible wrong paths:**
- Assuming that a larger component within an expression always leads to a larger overall value.
- Making inaccurate approximations without considering the magnitude of the error.
- Focusing on exact calculation when approximation is sufficient.

**Notes for generation:**
- Include options that require both simplification and approximation.
- Ensure the approximations are reasonable and lead to a clear ordering of the options.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q8`: Approximate each value to a comparable numerical value to determine the smallest. For example, approximate $\sqrt[3]{26.9}$ as slightly less than 3 and $\sqrt{9.01}$ as slightly greater than 3.

---
```

---

```markdown
## **M_31a98558. Flawed Deduction by Non-Unique Factorization**

**Core move:** Incorrectly assuming a specific factorization is the only possibility, leading to a false conclusion.

**Seen in / context:**
- Problems involving factorization of integers or polynomials.
- Questions where multiple solutions exist but only one is considered.
- Situations where the problem constraints do not uniquely define a solution.

**Possible wrong paths:**
- Prematurely concluding a solution based on a single factorization.
- Neglecting alternative factorizations that satisfy the given conditions.
- Ignoring the possibility of non-integer or complex solutions when factoring.

**Notes for generation:**
- Design questions where multiple factorizations are possible.
- Include constraints that might seem to limit solutions but don't actually.
- Ensure the "obvious" factorization leads to an incorrect answer.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q9`: The question involves finding integer solutions to an equation. Many students may find one solution and assume it is the only one, neglecting other possible factorizations that also satisfy the equation.

---
```

---

```markdown
## **M_a60d3739. Symmetry Argument for Integral Evaluation**

**Core move:** Exploiting symmetry properties of a function to determine the value of its definite integral over a symmetric interval.

**Seen in / context:**
- Integrals with symmetric limits of integration (e.g., -a to a).
- Identifying even or odd functions.
- Simplifying integrals by recognizing symmetric areas.

**Possible wrong paths:**
- Incorrectly assuming all functions are symmetric.
- Not recognizing the symmetry of the function.
- Applying symmetry arguments to non-symmetric intervals.

**Notes for generation:**
- Focus on integrals with limits -a to a.
- Vary the complexity of the function whose symmetry is to be exploited.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q10`: Recognizing that the integral of an odd function over a symmetric interval is zero.

---
```

---

```markdown
## **M_d552dd0c. Area Transformation via Function Shift**

**Core move:** Relate the area under a transformed function to the area under the original function by considering the geometric effect of the transformation (vertical shift) and calculating the additional area.

**Seen in / context:**
- Calculating areas under curves using integration.
- Problems involving vertical translations of functions.
- Situations where the area between two curves needs to be determined after a shift.

**Possible wrong paths:**
- Ignoring the change in area due to the vertical shift.
- Incorrectly calculating the area of the rectangle formed by the shift.
- Forgetting to consider the limits of integration.

**Notes for generation:**
- Focus on vertical shifts of functions.
- Ensure the shift creates a simple geometric shape (e.g., rectangle) for easy area calculation.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q11`: Recognize the vertical shift and calculate the area of the rectangle formed by the shift to find the change in the integral.

---
```

---

```markdown
## **M_8b5cf81a. Ordering Functions and Testing Inequalities**

**Core move:** Determining the validity of inequalities between trigonometric functions by considering their relative ordering within a specified interval and testing specific values.

**Seen in / context:**
- Comparing the magnitudes of trigonometric functions within a given interval.
- Verifying inequalities by substituting specific values within the domain.
- Establishing the relative ordering of functions to deduce inequality relationships.

**Possible wrong paths:**
- Assuming the inequality holds true for all values based on a limited number of test cases.
- Incorrectly determining the intervals where each function is increasing or decreasing.
- Neglecting to consider critical points or endpoints of the interval.

**Notes for generation:**
- Focus on inequalities involving trigonometric functions like sin(x), cos(x), and tan(x).
- Vary the interval over which the inequality is to be tested.
- Include inequalities that require careful consideration of function behavior.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q12`: Consider the relative magnitudes of sin(x) and cos(x) in the interval [0, pi/2] and test specific values to determine the validity of the given inequality.

---
```

---

```markdown
## **M_0e0cce70. Equation Manipulation and Inequality Deduction**

**Core move:** Manipulate an equation involving variables and exponents to derive inequalities between the variables.

**Seen in / context:**
- Equations involving exponents and variables.
- Deriving relationships between variables given an equation.
- Problems requiring the application of AM-GM inequality.

**Possible wrong paths:**
- Incorrectly applying algebraic manipulations, leading to a false equation.
- Assuming variables are positive when they can be negative or zero.
- Failing to recognize the applicability of inequalities like AM-GM.

**Notes for generation:**
- Ensure the equation allows for multiple manipulations to reach the inequality.
- Consider using exponents to create opportunities for AM-GM or similar inequalities.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q13`: Manipulating the given equation and applying AM-GM inequality to deduce the relationship between x, y, and z.

---
```

---

```markdown
## **M_c25c6566. Parameter Change Affects Vertex Location**

**Core move:** Changing a parameter in a quadratic function shifts the vertex of its graph, affecting its position relative to the axes.

**Seen in / context:**
- Quadratic functions and their graphs.
- Problems involving transformations of functions.
- Determining the maximum or minimum value of a quadratic.

**Possible wrong paths:**
- Assuming that changing a parameter only affects the shape of the parabola, not its position.
- Incorrectly calculating the vertex after a parameter change.
- Ignoring the effect of the parameter change on both the x and y coordinates of the vertex.

**Notes for generation:**
- Vary the parameter that is changed (e.g., coefficient of x^2, coefficient of x, constant term).
- Ask for the new location of the vertex after the change.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q14`: The question involves understanding how changing a parameter in a quadratic affects the location of its vertex and determining the new vertex coordinates.

---
```

---

```markdown
## **M_e4d8a43c. Iterative Function Evaluation and Pattern Recognition**

**Core move:** Iteratively compute function values to identify a repeating pattern or reach a stable state, then extrapolate to the desired input.

**Seen in / context:**
- Repeated application of a function to an initial value.
- Identifying cycles or fixed points in iterative processes.
- Extrapolating from a few iterations to a general rule.

**Possible wrong paths:**
- Stopping the iteration too early and missing the pattern.
- Incorrectly calculating the function value at each step.
- Assuming a pattern exists when the sequence is divergent or chaotic.

**Notes for generation:**
- Use functions that are easy to compute iteratively.
- Ensure the iteration reveals a clear, predictable pattern.
- The target input should require several iterations to reach, making manual calculation impractical.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q15`: The question requires repeated application of a function to find a pattern in the resulting sequence, then using that pattern to find a later term.

---
```

---

```markdown
## **M_4d8d6419. Counterexample by derivative and integer check**

**Core move:** To disprove a statement of the form 'If P then Q', find a case where P is true but Q is false by computing the derivative and checking integer values.

**Seen in / context:**
- Disproving a general statement about all values of a function.
- Finding a specific value that violates a given condition.
- Problems involving inequalities and derivatives.

**Possible wrong paths:**
- Assuming a statement is true without rigorous proof.
- Not considering specific integer values when the problem requires it.
- Incorrectly computing the derivative.

**Notes for generation:**
- The statement to be disproven should involve a condition on a function.
- The counterexample should be found by analyzing the derivative and/or integer values.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q16`: Compute the derivative of the function, find its critical points, and check integer values near those points to find a counterexample to the given statement.

---
```

---

```markdown
## **M_81857fde. Negating a Universal Conditional Statement**

**Core move:** To negate a statement of the form 'For all x in S, P(x) is true', show that 'There exists an x in S such that P(x) is false' by negating the conditional statement P(x).

**Seen in / context:**
- Questions involving logical negation of universally quantified statements.
- Problems requiring understanding of the difference between "all" and "some".
- Scenarios where a general rule is given and needs to be disproven.
- Mathematical statements involving quantifiers.

**Possible wrong paths:**
- Negating the quantifier incorrectly (e.g., assuming "not all" means "none").
- Negating only part of the conditional statement.
- Failing to recognize the conditional nature of the statement.
- Assuming that showing the statement is not always true is sufficient to negate it.

**Notes for generation:**
- Focus on statements with a clear universal quantifier (e.g., "all", "every").
- Ensure the conditional statement P(x) is non-trivial to negate.
- The set S should be well-defined.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q17`: The correct answer requires negating a universal statement about the properties of integers. The distractors often involve misinterpreting the scope of the negation or incorrectly negating the conditional.
---
```

---

```markdown
## **M_abe8e8c8. Identify Invalid Step in Mathematical Argument**

**Core move:** Pinpoint the exact step in a presented mathematical argument where a logical fallacy, arithmetic error, or incorrect application of a rule invalidates the conclusion.

**Seen in / context:**
- Arguments involving algebraic manipulation and simplification.
- Proofs by induction where the inductive step contains an error.
- Problems requiring careful attention to the order of operations.
- Situations where a hidden assumption is incorrectly applied.

**Possible wrong paths:**
- Accepting the conclusion without rigorously verifying each step.
- Overlooking subtle errors in algebraic manipulation.
- Assuming the validity of a step based on intuition rather than mathematical rules.
- Focusing on the overall strategy rather than the correctness of individual steps.

**Notes for generation:**
- Create multi-step solutions with one clear mistake.
- The mistake should be a common error (e.g., dividing by zero, incorrect sign).
- The argument should appear plausible at first glance.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q18`: The question requires identifying the incorrect step in a presented algebraic manipulation. The error involves an invalid operation that leads to a false conclusion.

---
```

---

```markdown
## **M_2d089359. Analyzing Function Extrema to Determine Roots**

**Core move:** Determine the extrema of a function and use these values to deduce the number of real roots based on the function's range.

**Seen in / context:**
- Determining the range of a function based on its stationary points.
- Relating the sign of function values at extrema to the number of roots.
- Analyzing polynomial functions to find the number of real solutions.

**Possible wrong paths:**
- Assuming that every stationary point corresponds to a root.
- Incorrectly calculating the derivative or finding the stationary points.
- Failing to consider the behavior of the function as x approaches positive or negative infinity.

**Notes for generation:**
- Focus on polynomial or trigonometric functions where extrema can be found analytically.
- Vary the complexity of the function to adjust the difficulty.
- Ensure the relationship between extrema and root count is not immediately obvious.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q19`: The question requires finding the range of the function by analysing its stationary points and then deducing the number of real roots based on the range.

---
```

---

```markdown
## **M_b0d9f1a5. Deduction by Elimination with Constraints**

**Core move:** Eliminate possibilities based on constraints and feedback to narrow down the solution space.

**Seen in / context:**
- Problems with multiple possible solutions or cases.
- Situations where constraints limit the feasible options.
- Questions involving logical deduction and reasoning.

**Possible wrong paths:**
- Overlooking a constraint and considering invalid possibilities.
- Making assumptions not supported by the given information.
- Prematurely converging on a solution without exploring all options.

**Notes for generation:**
- Include a set of constraints that limit the possible solutions.
- Design the problem so that eliminating options is the most efficient strategy.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2017_Q20`: The question requires systematically eliminating possibilities based on given constraints about the number of students studying different subjects to find the minimum number of students studying both Maths and Physics.

---
```

---

```markdown
## **M_bb08c498. Differentiate and Evaluate Function**

**Core move:** Find the derivative of a function and then evaluate the derivative at a specific point.

**Seen in / context:**
- Questions involving rates of change.
- Problems requiring optimization.
- Finding the gradient of a curve at a given x-value.

**Possible wrong paths:**
- Incorrectly applying differentiation rules (e.g., chain rule, product rule).
- Making algebraic errors when simplifying the derivative.
- Substituting the original function into the derivative instead of the specified x-value.

**Notes for generation:**
- Vary the complexity of the function to be differentiated (polynomial, trigonometric, exponential, etc.).
- Include implicit differentiation.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2018_Q1`: The question requires finding the derivative of a function and evaluating it at a specific point to determine the rate of change.
---
```

---

```markdown
## **M_17caf9e7. Finding Constant Term in Binomial Expansion**

**Core move:** Identify the term in a binomial expansion that results in a constant value by setting the exponent of the variable to zero and then calculating the coefficient of that term.

**Seen in / context:**
- Binomial expansions where a specific term (the constant term) needs to be isolated.
- Problems involving fractional or negative exponents in binomial expansions.
- Questions that require algebraic manipulation to simplify the binomial expansion before finding the constant term.

**Possible wrong paths:**
- Incorrectly identifying the general term in the binomial expansion.
- Making algebraic errors when solving for the exponent that results in a constant term.
- Forgetting to calculate the coefficient of the constant term after finding the correct exponent.

**Notes for generation:**
- Vary the complexity of the binomial expression (e.g., fractional exponents, negative exponents).
- Include binomial expansions that require simplification before identifying the constant term.
- Ensure the variable and its exponent are clearly defined within the binomial expression.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2018_Q2`: The question requires finding the constant term in the expansion of $(x^2 + \frac{1}{x})^9$. The core move is to identify the term where the powers of x cancel out, resulting in a constant.

---
```

---

```markdown
## **M_e99298f5. Counterexample Identification via Calculation and Comparison**

**Core move:** Identify counterexamples by calculating the actual result based on the provided information and comparing it to the claim to see if they match.

**Seen in / context:**
- Questions involving claims or statements that may or may not be universally true.
- Problems where a specific case can be tested against a general rule.
- Logical reasoning problems with potential exceptions.

**Possible wrong paths:**
- Assuming a statement is true without testing specific cases.
- Failing to perform the necessary calculations accurately.
- Misinterpreting the conditions or constraints of the problem.

**Notes for generation:**
- Create questions with a claim that seems plausible but has at least one easily calculable counterexample.
- Ensure the calculation required to find the counterexample is straightforward.
- Focus on mathematical or logical statements.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2018_Q3`: The question requires testing each statement with specific numbers to see if the statement always holds true, and identifying the statement that is false for at least one case.

---
```

---

```markdown
## **M_0f03c0e0. Transform Equation and Adjust Range**

**Core move:** Transform a trigonometric equation using identities and adjust the range of the variable to account for the transformation when counting solutions.

**Seen in / context:**
- Solving trigonometric equations where a transformed angle (e.g., 2x, x/2, x+π/4) is present.
- Counting the number of solutions to a trigonometric equation within a specified interval after a variable substitution.
- Problems requiring manipulation of trigonometric identities to simplify the equation before solving.

**Possible wrong paths:**
- Forgetting to adjust the range of the variable after a substitution, leading to incorrect solution counts.
- Incorrectly applying trigonometric identities, resulting in an altered equation with different solutions.
- Solving for the transformed variable but failing to convert back to the original variable.

**Notes for generation:**
- Ensure the transformation of the angle is non-trivial (e.g., 2x, x/3, x - π/2).
- The question should require counting solutions within a specific range.
- Consider using trigonometric identities that are not immediately obvious.
- From TMUA Paper 2 (Mathematical Reasoning)

**Exemplar questions:**
- `TMUA_Paper2_2018_Q4`: Requires transforming the equation using the double angle formula and adjusting the range to find the number of solutions.

---
```

---

