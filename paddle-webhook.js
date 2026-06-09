// ============================================
// STACKD — PADDLE WEBHOOK HANDLER
// Listens for Paddle subscription events
// and updates Supabase accordingly
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const event = req.body

  console.log('Paddle webhook received:', event.event_type)

  try {
    const eventType = event.event_type
    const data = event.data

    // Map Paddle price IDs to plan names
    const PRICE_TO_PLAN = {
      'pri_01ktpq347vsgkzx5w53r1f1fph': 'pro',
      'pri_01ktpq7py8m99rq5gyseg87086': 'career'
    }

    if (eventType === 'subscription.created' || eventType === 'subscription.activated') {
      const priceId = data.items?.[0]?.price?.id
      const plan = PRICE_TO_PLAN[priceId] || 'free'
      const customerId = data.customer_id
      const subscriptionId = data.id
      const periodEnd = data.current_billing_period?.ends_at
      const customerEmail = data.customer?.email

      if (!customerEmail) {
        console.log('No email in webhook, skipping')
        return res.status(200).json({ received: true })
      }

      // Find user by email
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail)
        .single()

      if (userError || !users) {
        console.log('User not found for email:', customerEmail)
        return res.status(200).json({ received: true })
      }

      // Update or create subscription
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: users.id,
          paddle_customer_id: customerId,
          paddle_subscription_id: subscriptionId,
          plan,
          status: 'active',
          current_period_end: periodEnd
        }, { onConflict: 'user_id' })

      if (error) console.error('Supabase upsert error:', error)
      else console.log(`Plan updated to ${plan} for user ${users.id}`)
    }

    if (eventType === 'subscription.cancelled') {
      const subscriptionId = data.id

      const { error } = await supabase
        .from('subscriptions')
        .update({ plan: 'free', status: 'cancelled' })
        .eq('paddle_subscription_id', subscriptionId)

      if (error) console.error('Cancel update error:', error)
      else console.log('Subscription cancelled:', subscriptionId)
    }

    if (eventType === 'subscription.paused') {
      const subscriptionId = data.id

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('paddle_subscription_id', subscriptionId)

      if (error) console.error('Pause update error:', error)
    }

    if (eventType === 'subscription.updated') {
      const priceId = data.items?.[0]?.price?.id
      const plan = PRICE_TO_PLAN[priceId] || 'free'
      const subscriptionId = data.id
      const periodEnd = data.current_billing_period?.ends_at

      const { error } = await supabase
        .from('subscriptions')
        .update({ plan, status: 'active', current_period_end: periodEnd })
        .eq('paddle_subscription_id', subscriptionId)

      if (error) console.error('Update error:', error)
      else console.log(`Plan updated to ${plan}`)
    }

    return res.status(200).json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
