export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Политика конфиденциальности</h1>
        <p className="text-gray-500 mb-8">Последнее обновление: 18 апреля 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Какие данные мы собираем</h2>
            <p>При использовании Razum AI мы можем собирать следующие данные:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Данные аккаунта:</strong> email, имя, дата регистрации</li>
              <li><strong>Данные использования:</strong> количество запросов, выбранная модель, тарифный план</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, для обеспечения безопасности</li>
              <li><strong>Данные оплаты:</strong> обрабатываются платёжной системой Robokassa, мы не храним данные карт</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Как мы используем данные</h2>
            <p>Собранные данные используются для:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Предоставления и улучшения Сервиса</li>
              <li>Управления вашим аккаунтом и тарифным планом</li>
              <li>Обеспечения безопасности и предотвращения злоупотреблений</li>
              <li>Отправки важных уведомлений о Сервисе</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Хранение чатов</h2>
            <p>Тексты ваших запросов к AI обрабатываются в реальном времени и <strong>не сохраняются на наших серверах</strong> после завершения сессии. Мы храним только метаданные (количество запросов, время) для учёта лимитов.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Децентрализованная обработка</h2>
            <p>Ваши запросы могут обрабатываться на GPU-узлах участников децентрализованной сети. Запросы передаются в зашифрованном виде. Майнеры не имеют доступа к вашим персональным данным — только к тексту запроса для генерации ответа.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Передача данных третьим лицам</h2>
            <p>Мы не продаём и не передаём ваши персональные данные третьим лицам, за исключением:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Платёжные провайдеры (Robokassa) — для обработки оплат</li>
              <li>По требованию закона — при наличии судебного решения</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Безопасность</h2>
            <p>Мы применяем стандартные меры безопасности: шифрование паролей (PBKDF2-SHA512), HTTPS для всех соединений, подписанные токены авторизации. Однако абсолютная безопасность в интернете невозможна.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Ваши права</h2>
            <p>Вы имеете право:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Запросить копию ваших данных</li>
              <li>Потребовать удаление аккаунта и всех данных</li>
              <li>Отказаться от маркетинговых рассылок</li>
              <li>Изменить или исправить ваши данные</li>
            </ul>
            <p className="mt-2">Для реализации этих прав напишите на <a href="mailto:support@airazum.com" className="text-emerald-400 hover:underline">support@airazum.com</a></p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Файлы cookie</h2>
            <p>Мы используем только необходимые cookie для авторизации (razum_token). Мы не используем рекламные или аналитические cookie третьих сторон.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Контакты</h2>
            <p>По вопросам конфиденциальности: <a href="mailto:support@airazum.com" className="text-emerald-400 hover:underline">support@airazum.com</a></p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800">
          <a href="/" className="text-emerald-400 hover:underline text-sm">&larr; На главную</a>
        </div>
      </div>
    </div>
  )
}
