const memory = new Float64Array(32);
const labels = new Map<number, number>();

var program: string[] = ['0'];
var line = 0;
var cursor = 0;

const operators = {
  ':': (c: number, a: number) => (cursor = a | 0, c),
  '+': (c: number, a: number) => c + a,
  '-': (c: number, a: number) => c - a,
  '*': (c: number, a: number) => c * a,
  '/': (c: number, a: number) => c / a,
  '%': (c: number, a: number) => c % a,
  '|': (c: number, a: number) => c | a,
  '>': (c: number, a: number) => c >> a,
  '<': (c: number, a: number) => c << a,
  '^': (c: number, a: number) => c ** a,
  '(': (c: number, arg: number) => (labels.set(arg, line), c),
  ')': (c: number, arg: number) => (line = c > 0 ? labels.get(arg) ?? line : line, c),
  'CLAMP': (c: number, a: number, b: number) => Math.min(Math.max(a, b), Math.max(c, Math.min(a, b))),
  'SIN': (c: number) => Math.sin(c),
  'COS': (c: number) => Math.cos(c),
  'TAN': (c: number) => Math.tan(c),
  'ATAN': (c: number) => Math.atan(c),
  'CL': (c: number) => (console.clear(), c),
  'EXIT': (c: number) => (process.exit(0), c)
} as const;

function parseArguments(str: string) {
  return str
    .split(/\s*\,\s*/)
    .filter(Boolean)
    .map(arg => {
      if (arg.startsWith('0B'))
        return parseInt(arg.slice(2), 2);

      if (arg.startsWith('0X'))
        return parseInt(arg.slice(2), 16);

      if (arg.startsWith('M'))
        return memory[parseInt(arg.slice(1))];

      return parseFloat(arg);
    })
    .map(arg => {
      if (isNaN(arg))
        throw new Error('Incorrect cmd or argument');

      return arg;
    });
}

function processor(cmd: string) {
  try {
    const keys = Object.keys(operators) as Array<keyof typeof operators>;
    keys.sort((a, b) => b.length - a.length);
    cmd = cmd.toUpperCase();

    for (var key of keys) {
      if (cmd.startsWith(key)) {
        const func: (...args: number[]) => number = (
          operators[key]
        );

        const previewCursor = cursor;
        const parsed = parseArguments(cmd.slice(key.length).trim());

        if (func.length - 1 > parsed.length) {
          throw new Error('Need arguments count ' + (func.length - 1));
        }

        memory[cursor] = func(memory[cursor], ...parsed);

        if (memory[cursor] === undefined) {
          cursor = previewCursor;
          throw new Error('Outside of memory');
        }
        return;
      }
    }

    memory[cursor] = parseArguments(cmd).at(-1) ?? 0;
  } catch (e: any) {
    console.log(`Error: ${e?.message ?? e}`);
  } finally {
    console.log(`=${memory[cursor]} (${cursor})`);
  }
}

process.stdin.on('data', (row) => {
  program.push(row.toString('utf-8'));
});

if (process.argv[2]) {
  const text = await Bun.file(process.argv[2]).text();
  program = text
    .split(/\n+/)
    .map(e => e.trim())
    .filter(Boolean)
    .filter(e => e[0] !== '#');
}

function sleep(n: number) {
  return new Promise(resolve => setTimeout(resolve, n));
}

while (true) {
  await sleep(0);
  var row = program[line];
  if (!row) continue;
  line++;
  processor(row);
}

