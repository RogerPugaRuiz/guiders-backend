/**
 * Tests del SOP try-tdd-generator (AI-1.5 retro Story 2.2).
 *
 * El SOP es procedural (es un documento .md), pero la parte testeable
 * es la función `detectSubagentFailure()` que el dev agent (o un
 * futuro script automatizado) usa para decidir si el output del
 * subagente @tdd-generator es válido.
 *
 * Esta función NO se importa desde el SOP — está duplicada aquí
 * como un test del comportamiento esperado. Si el SOP cambia, este
 * test DEBE actualizarse.
 *
 * Story 2.1 + 2.2 retrometrics: subagent returned empty 2/2 times.
 * These heuristics must catch:
 *   - `<output></output>` (literal empty tags)
 *   - null/undefined/empty string
 *   - Output without "Files created" section
 *   - Output with self-score < 8
 *   - "FAILURE" markers from the subagent
 *
 * If ANY heuristic returns true, the dev agent MUST fall back to
 * manual test writing (Pattern A/B/C from the SOP).
 */

import { describe, it, expect } from '@jest/globals';

interface SubagentResult {
  task_result: string | null | undefined;
}

interface FailureCheck {
  isFailure: boolean;
  reason: string;
}

/**
 * Pure function: detects if @tdd-generator subagent output indicates
 * a failure that should trigger the manual fallback.
 *
 * IMPORTANT: This function is documented in
 * `.opencode/skills/try-tdd-generator.md` Step 2.
 * If you change the heuristics here, update the SOP document.
 */
function detectSubagentFailure(result: SubagentResult): FailureCheck {
  const output = result.task_result;

  // Signal 1: empty / null / undefined
  if (output === null || output === undefined) {
    return { isFailure: true, reason: 'task_result is null or undefined' };
  }

  if (typeof output !== 'string') {
    return { isFailure: true, reason: 'task_result is not a string' };
  }

  if (output.trim() === '') {
    return { isFailure: true, reason: 'task_result is empty string' };
  }

  // Signal 2: empty tags (the observed failure mode in Story 2.1 + 2.2)
  if (output.trim() === '<output></output>') {
    return { isFailure: true, reason: 'task_result is <output></output>' };
  }

  // Signal 3: missing "Files created" section
  if (!output.toLowerCase().includes('files created')) {
    return {
      isFailure: true,
      reason: 'output does not include "Files created" section',
    };
  }

  // Signal 4: zero files created
  if (/files created.*0 files|0 files created/i.test(output)) {
    return {
      isFailure: true,
      reason: 'output reports 0 files created',
    };
  }

  // Signal 5: explicit FAILURE marker
  if (/\bFAILURE\b.*\bsubagent\b|empty output.*subagent/i.test(output)) {
    return { isFailure: true, reason: 'output contains FAILURE marker' };
  }

  // Signal 6: self-score < 8 (subagent self-evaluates)
  if (/score[:\s]+([0-7](\.\d+)?)\s*\/\s*10/i.test(output)) {
    return {
      isFailure: true,
      reason: 'output self-score is < 8',
    };
  }

  return { isFailure: false, reason: 'output looks valid' };
}

describe('try-tdd-generator SOP — detectSubagentFailure()', () => {
  describe('empty / null / undefined inputs', () => {
    it('debe detectar null', () => {
      const result = detectSubagentFailure({ task_result: null });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('null');
    });

    it('debe detectar undefined', () => {
      const result = detectSubagentFailure({ task_result: undefined });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('null');
    });

    it('debe detectar string vacío', () => {
      const result = detectSubagentFailure({ task_result: '' });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('empty');
    });

    it('debe detectar whitespace-only string', () => {
      const result = detectSubagentFailure({ task_result: '   \n\t  ' });
      expect(result.isFailure).toBe(true);
    });

    it('debe detectar el caso observed "<output></output>"', () => {
      // This is the EXACT failure pattern observed in Story 2.1 and 2.2.
      const result = detectSubagentFailure({
        task_result: '<output></output>',
      });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('<output></output>');
    });

    it('debe detectar "<output></output>" con whitespace', () => {
      const result = detectSubagentFailure({
        task_result: '  \n  <output></output>  \n  ',
      });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('missing required sections', () => {
    it('debe fallar si no menciona "Files created"', () => {
      const result = detectSubagentFailure({
        task_result: 'I generated the tests successfully. Score: 9/10',
      });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('Files created');
    });

    it('debe fallar si "Files created" pero 0 files', () => {
      const result = detectSubagentFailure({
        task_result:
          'Files created: 0 files created. Test counts per file: none. Score: 9/10',
      });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('0 files');
    });

    it('debe aceptar "1 file" (singular)', () => {
      const result = detectSubagentFailure({
        task_result:
          'Files created:\n- /path/to/file.ts\n\n1 test in the suite. Score: 9/10',
      });
      expect(result.isFailure).toBe(false);
    });

    it('debe aceptar "3 files" (plural)', () => {
      const result = detectSubagentFailure({
        task_result:
          'Files created (3 files):\n- /a.ts\n- /b.ts\n- /c.ts\n\nTest counts: 5+10+8 = 23 tests. Score: 9/10',
      });
      expect(result.isFailure).toBe(false);
    });
  });

  describe('self-score detection', () => {
    it('debe fallar si score = 5/10', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created: 1 file. Score: 5/10 — concerns about X',
      });
      expect(result.isFailure).toBe(true);
      expect(result.reason).toContain('self-score');
    });

    it('debe fallar si score = 7.5/10', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created: 1 file. Score: 7.5/10 — minor concerns',
      });
      expect(result.isFailure).toBe(true);
    });

    it('debe aceptar score = 8/10', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created: 1 file. Score: 8/10',
      });
      expect(result.isFailure).toBe(false);
    });

    it('debe aceptar score = 9/10', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created: 1 file. Score: 9/10',
      });
      expect(result.isFailure).toBe(false);
    });

    it('debe aceptar score = 10/10', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created: 1 file. Score: 10/10',
      });
      expect(result.isFailure).toBe(false);
    });
  });

  describe('FAILURE markers', () => {
    it('debe detectar "FAILURE" + "subagent" explícito', () => {
      const result = detectSubagentFailure({
        task_result:
          'FAILURE: subagent returned empty output. Could not generate tests.',
      });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('valid outputs (sanity checks)', () => {
    it('debe aceptar output mínimo válido', () => {
      const result = detectSubagentFailure({
        task_result: 'Files created:\n- /path/file.ts\n\nTests: 5. Score: 9/10',
      });
      expect(result.isFailure).toBe(false);
      expect(result.reason).toContain('valid');
    });

    it('debe aceptar output con detalles completos', () => {
      const result = detectSubagentFailure({
        task_result: `
          # Story 2.3 — Token Revocation

          Files created (3 files):
          - /Users/.../command-handler.spec.ts
          - /Users/.../controller.spec.ts
          - /Users/.../integration.spec.ts

          Test counts per file:
          - command-handler.spec.ts: 8 tests
          - controller.spec.ts: 5 tests
          - integration.spec.ts: 3 tests

          Self-score: 9/10
        `,
      });
      expect(result.isFailure).toBe(false);
    });
  });
});
