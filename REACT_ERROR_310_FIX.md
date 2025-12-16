# React Error #310 Fix Guide

## Problem
"Rendered more hooks than during the previous render" - This error occurs when hooks are called conditionally or in different orders between renders.

## Root Cause
React Hooks must be called:
1. **Unconditionally** - Never inside if/else, loops, or conditionals
2. **In the same order** - Every render must call the same hooks in the same order
3. **At the top level** - Before any early returns

## Transactions Page Analysis ✅

The `/transactions` page is **CORRECTLY** structured:

```typescript
export default function TransactionsPage() {
  // ✅ ALL HOOKS CALLED UNCONDITIONALLY AT TOP LEVEL
  const [user] = useAuthState(auth);                    // Hook 1
  const [transactions, setTransactions] = useState([]); // Hook 2
  const [loading, setLoading] = useState(true);        // Hook 3
  const [searchTerm, setSearchTerm] = useState("");    // Hook 4
  const [filterType, setFilterType] = useState("all");  // Hook 5
  const [userData, setUserData] = useState(null);       // Hook 6
  
  useEffect(() => { ... }, [user]);                     // Hook 7
  const filteredTransactions = useMemo(() => {...});    // Hook 8
  const totalAmount = useMemo(() => {...});             // Hook 9
  const paidCount = useMemo(() => {...});               // Hook 10
  
  // ✅ Early return AFTER all hooks
  if (!user) {
    return <div>...</div>;
  }
  
  return <div>...</div>;
}
```

## Known Issues in Other Components ⚠️

### 1. GSTR1 Wizard (src/components/gst-wizards/gstr1-wizard.tsx)
**PROBLEM**: Hooks called after early return
```typescript
// ❌ BAD
if (user && isFreemium) {
  return <UpgradeRequiredAlert />;
}
const { toast } = useToast();  // Hook called after return!
const [step, setStep] = useState(1);  // Hook called after return!
```

**FIX**: Move all hooks before the early return
```typescript
// ✅ GOOD
const { toast } = useToast();
const [step, setStep] = useState(1);
// ... all other hooks

if (user && isFreemium) {
  return <UpgradeRequiredAlert />;
}
```

### 2. Dashboard Content (src/components/dashboard/dashboard-content.tsx)
**POTENTIAL ISSUE**: Early return after some hooks but before others
```typescript
// Check if this pattern exists and fix if needed
if (!accountingContext) {
  return <Loader />;
}
// More hooks called here...
```

## Verification Checklist

For any component with React Error #310:

- [ ] All `useState` calls are at the top level
- [ ] All `useEffect` calls are at the top level  
- [ ] All `useMemo` calls are at the top level
- [ ] All `useCallback` calls are at the top level
- [ ] All custom hooks (`use*`) are at the top level
- [ ] No hooks inside `if/else` statements
- [ ] No hooks inside loops
- [ ] No hooks inside `try/catch` blocks
- [ ] No hooks after early `return` statements
- [ ] All hooks called in the same order every render

## Testing

1. Run locally: `npm run dev`
2. Navigate to the problematic page
3. Check browser console for detailed error messages
4. The error will point to the exact component and line number

## Next Steps

1. ✅ Transactions page is correctly structured
2. ⚠️ Check if error persists after clearing cache
3. ⚠️ Verify no parent component is causing the issue
4. ⚠️ Check if error occurs in other pages too

