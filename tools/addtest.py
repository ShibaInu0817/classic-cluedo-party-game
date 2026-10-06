#!/usr/bin/env python3
"""Dev helper: insert a test block before the final '});' of a vitest file. Usage: addtest.py FILE < block"""
import sys
p = sys.argv[1]; block = sys.stdin.read()
s = open(p).read().rstrip()
assert s.endswith('});'), 'file must end with });'
s = s[:-3].rstrip() + '\n\n' + block.rstrip() + '\n});\n'
open(p, 'w').write(s)
