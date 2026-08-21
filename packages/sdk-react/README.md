# @qiflow/react

React bindings for [QiFlow Inline checkout](https://qiflow.io/docs/inline).

```bash
npm i @qiflow/react
```

```tsx
import { QiFlowButton, useQiFlowInline } from '@qiflow/react';

// 1) Server-created payment (recommended): your API returns paymentCode
<QiFlowButton paymentCode={paymentCode} onSuccess={(p) => router.push(`/thanks?ref=${p.paymentCode}`)}>
  Pay 12 QI
</QiFlowButton>

// 2) Client-only with a publishable key
const { open } = useQiFlowInline();
open({ key: 'qiflow_pk_live_…', amount: 12, currency: 'QI', reference: order.id, onSuccess });
```

Always confirm payment on your server via webhook before fulfilling.
