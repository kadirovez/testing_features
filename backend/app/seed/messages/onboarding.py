from app.core.i18n.types import LocalizedText

GUIDE_MESSAGE = LocalizedText(
    code="onboarding_guide",
    message={
        "en": (
            "Here is a quick tour of the app:\n\n"
            "• Sidebar — your chats. Use the search field to find people or conversations.\n"
            "• Menu (☰) — My profile, Contacts, and Settings.\n"
            "• Contacts — add people by username to start a direct chat.\n"
            "• Chat header — tap the name to open the info panel (media, files, links).\n"
            "• Messages — right-click for copy or delete. Your messages appear on the right.\n"
            "• Settings — theme, language, avatar, and privacy options.\n\n"
            "Need a hand? Message someone from your contacts or come back to this chat anytime."
        ),
        "ru": (
            "Краткая инструкция по приложению:\n\n"
            "• Боковая панель — ваши чаты. Поле поиска помогает найти людей и переписки.\n"
            "• Меню (☰) — мой профиль, контакты и настройки.\n"
            "• Контакты — добавьте человека по нику, чтобы начать личный чат.\n"
            "• Шапка чата — нажмите на имя, чтобы открыть панель сведений (медиа, файлы, ссылки).\n"
            "• Сообщения — правый клик: копировать или удалить. Ваши сообщения справа.\n"
            "• Настройки — тема, язык, аватар и параметры приватности.\n\n"
            "Если что-то непонятно — напишите знакомому из контактов или вернитесь в этот чат."
        ),
    },
)

WELCOME_MESSAGE = LocalizedText(
    code="onboarding_welcome",
    message={
        "en": (
            "Welcome! We're glad you're here.\n\n"
            "Open the menu and go to Contacts — add people you know by username. "
            "Once they are in your list, you can open a chat and send your first message."
        ),
        "ru": (
            "Добро пожаловать! Рады, что вы с нами.\n\n"
            "Откройте меню и перейдите в «Контакты» — добавьте знакомых по нику. "
            "Когда они появятся в списке, можно открыть чат и написать первое сообщение."
        ),
    },
)
