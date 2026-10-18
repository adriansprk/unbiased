import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { render } from '@testing-library/react';
import messages from '@/messages/en';

export function renderWithI18n(ui: React.ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );
}
