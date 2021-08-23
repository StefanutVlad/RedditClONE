import React, { InputHTMLAttributes } from "react";
import { useField } from "formik";
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Textarea,
} from "@chakra-ui/core";


//props type = regular field input
type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string; //name required
  textarea?: boolean;
};

export const InputField: React.FC<InputFieldProps> = ({
  label,
  textarea,
  size: _,
  ...props
}) => {
  let InputOrTextArea = Input;
  if (textarea) {
    InputOrTextArea = Textarea;
  }
  //formik hook
  const [field, { error }] = useField(props);
  return (
    //!! -> string casted to boolean
    //""=> false
    //"error message stuff" => true
    <FormControl isInvalid={!!error}>
      <FormLabel htmlFor={field.name}>{label}</FormLabel>
      <InputOrTextArea {...field} {...props} id={field.name} />
      {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
    </FormControl>
  );
};
