"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authInputClassName, authLabelClassName } from "./form-styles";

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function PasswordField({ id, label, autoComplete }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = `${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`;
  const ToggleIcon = isVisible ? EyeOff : Eye;

  return (
    <div className="mb-6">
      <label className={authLabelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={`${authInputClassName} pr-14`}
          id={id}
          maxLength={MAX_PASSWORD_LENGTH}
          minLength={MIN_PASSWORD_LENGTH}
          name={id}
          required
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-controls={id}
          aria-label={toggleLabel}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-1 my-auto grid size-11 place-items-center rounded-lg text-[#4b5563] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e65c00]"
          onClick={() => setIsVisible((visible) => !visible)}
          type="button"
        >
          <ToggleIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
