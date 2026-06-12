import { NextResponse } from 'next/server';
import { buildDynamicSummary } from '../../../lib/sampleData';
import { buildDataBrief, getDemoAnswer } from '../../../lib/analytics';

export async function POST(request) {
  try {
    const body = await request.json();
    const restaurantId = body?.restaurant_id || body?.restaurantId || 'all';
    const aiMode = body?.ai_mode || body?.aiMode || 'director';
    const summary = buildDynamicSummary({ restaurantId });
    const question = String(body?.question || '').trim();

    if (!question) {
      return NextResponse.json({ answer: 'Напиши вопрос: по сети, выручке, рискам, прогнозу, официантам, блюдам, фудкосту или скидкам.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer: getDemoAnswer(question, summary),
        mode: 'demo_without_openai_key'
      });
    }

    const dataBrief = buildDataBrief(summary);

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: `Ты AI-операционный директор ресторана/сети ресторанов. Режим анализа: ${aiMode}. Отвечай по-русски, коротко, конкретно, только по данным. Не выдумывай цифры. Формат: 1 короткий вывод, затем 2-4 действия. Упор на деньги, риски, прогноз, команду, меню и действия на сегодня.`
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Данные ресторана:\n${dataBrief}\n\nВопрос владельца: ${question}`
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI error:', errorText);
      return NextResponse.json({
        answer: getDemoAnswer(question, summary),
        mode: 'fallback_after_openai_error'
      });
    }

    const data = await aiResponse.json();
    const answer = data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text).filter(Boolean).join('\n') || getDemoAnswer(question, summary);

    return NextResponse.json({ answer, mode: 'openai' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ answer: 'Ошибка AI-чата. Проверь логи Vercel и переменную OPENAI_API_KEY.' }, { status: 500 });
  }
}
