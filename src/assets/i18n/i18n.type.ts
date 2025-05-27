import { I18nKey } from '../../constants.ts';

export type i18n = {
    [K in I18nKey]: string;
};