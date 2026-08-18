import { Text, TextInput } from 'react-native';

type ComponentWithDefaults = {
  defaultProps?: Record<string, unknown>;
};

/**
 * Keep system accessibility font-size changes from changing the dimensions of
 * fixed mobile layouts. Individual components can still opt in explicitly.
 */
const disableFontScaling = (component: ComponentWithDefaults) => {
  component.defaultProps = {
    ...component.defaultProps,
    allowFontScaling: false,
  };
};

disableFontScaling(Text as unknown as ComponentWithDefaults);
disableFontScaling(TextInput as unknown as ComponentWithDefaults);
