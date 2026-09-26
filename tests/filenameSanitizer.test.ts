import { describe, it, expect } from 'vitest';
import { sanitizeFilename, isValidFilename } from '../src/utils/filenameSanitizer.ts';

describe('filenameSanitizer', () => {
  it('handles reserved Windows device names with and without extensions', () => {
    expect(sanitizeFilename('CON')).toBe('_CON_');
    expect(sanitizeFilename('PRN.txt')).toBe('_PRN_.txt');
    expect(sanitizeFilename('aux')).toBe('_aux_');
    expect(sanitizeFilename('nul.mp4')).toBe('_nul_.mp4');
    expect(sanitizeFilename('COM1')).toBe('_COM1_');
    expect(sanitizeFilename('lpt9.recall')).toBe('_lpt9_.recall');
  });

  it('replaces illegal characters and path separators', () => {
    expect(sanitizeFilename('Lesson: Introduction / Part 1')).toBe('Lesson_ Introduction _ Part 1');
    expect(sanitizeFilename('foo/bar\\baz')).toBe('foo_bar_baz');
    expect(sanitizeFilename('file*name?with"bad<chars>|here')).toBe('file_name_with_bad_chars__here');
  });

  it('removes trailing dots and spaces from basename before extension', () => {
    expect(sanitizeFilename('foo. ')).toBe('foo');
    expect(sanitizeFilename('foo. .txt')).toBe('foo.txt');
    expect(sanitizeFilename('title....')).toBe('title');
  });

  it('handles empty and whitespace-only filenames with a fallback', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename('   ')).toBe('untitled');
    expect(sanitizeFilename('///')).toBe('untitled');
  });

  it('truncates very long filenames to a safe maximum length while preserving extension', () => {
    const longName = 'a'.repeat(300) + '.recall';
    const sanitized = sanitizeFilename(longName, 'untitled', 100);
    expect(sanitized.length).toBeLessThanOrEqual(100);
    expect(sanitized.endsWith('.recall')).toBe(true);
  });

  it('validates filenames correctly with isValidFilename', () => {
    expect(isValidFilename('normal_project.recall')).toBe(true);
    expect(isValidFilename('CON')).toBe(false);
    expect(isValidFilename('bad:name.recall')).toBe(false);
    expect(isValidFilename('trailing. ')).toBe(false);
  });
});
