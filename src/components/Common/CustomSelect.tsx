import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: Array<CustomSelectOption | string>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  id?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

const EMPTY_VALUE_TOKEN = '__CUSTOM_SELECT_EMPTY__';

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option…',
  disabled = false,
  className = '',
  contentClassName = '',
  id,
  ariaLabel,
  size = 'md',
}) => {
  const normalizedOptions: CustomSelectOption[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Radix select value must not be empty string if selected, or undefined if unset
  const safeValue = !value || value === '' ? undefined : value;

  const handleValueChange = (val: string) => {
    if (val === EMPTY_VALUE_TOKEN) {
      onChange('');
    } else {
      onChange(val);
    }
  };

  return (
    <Select.Root
      value={safeValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        aria-label={ariaLabel || placeholder}
        className={`custom-select-trigger custom-select-trigger-${size} ${className}`}
      >
        <span className="custom-select-value-wrap">
          <Select.Value placeholder={placeholder} />
        </span>
        <Select.Icon asChild>
          <ChevronDown size={size === 'sm' ? 13 : 15} className="custom-select-chevron" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={5}
          className={`custom-select-content ${contentClassName}`}
        >
          <Select.Viewport className="custom-select-viewport">
            {normalizedOptions.map((opt) => {
              const itemVal = opt.value === '' ? EMPTY_VALUE_TOKEN : opt.value;
              return (
                <Select.Item
                  key={itemVal}
                  value={itemVal}
                  disabled={opt.disabled}
                  className="custom-select-item"
                >
                  <div className="custom-select-item-text-wrap">
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    {opt.description && (
                      <span className="custom-select-item-desc">{opt.description}</span>
                    )}
                  </div>
                  <Select.ItemIndicator className="custom-select-indicator">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
