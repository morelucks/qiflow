# @qiflow/sdk

Official Node.js SDK for [QiFlow](https://qiflow.io) — accept Qi / QUAI payments on Quai Network.

```bash
npm i @qiflow/sdk
```

```js
import { QiFlow } from '@qiflow/sdk';

const qiflow = new QiFlow({ apiKey: process.env.QIFLOW_API_KEY });

const payment = await qiflow.payments.create({ amount: 12.5, currency: 'QI', description: 'Order #8492' });
redirect(payment.checkoutUrl); // or open it with Inline checkout in the browser

// Webhooks (Express, raw body)
app.post('/webhooks/qiflow', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const event = QiFlow.webhooks.constructEvent({
      rawBody: req.body,
      secret: process.env.QIFLOW_WEBHOOK_SECRET,
      signature: req.header('X-QiFlow-Signature'),
      timestamp: req.header('X-QiFlow-Timestamp'),
    });
    if (event.event === 'payment.completed') fulfil(event.payment.paymentCode);
    res.sendStatus(200);
  } catch {
    res.sendStatus(401);
  }
});
```

Docs: https://qiflow.io/docs/sdks
