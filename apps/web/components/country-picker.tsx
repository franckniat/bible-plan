"use client"

import "flag-icons/css/flag-icons.min.css"

import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import { getCountries, type Country, type CountryCode } from "@workspace/core"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import { InputGroupAddon } from "@workspace/ui/components/input-group"
import { cn } from "@workspace/ui/lib/utils"

/** SVG flag (emoji flags are not rendered on Windows). */
export function Flag({
  code,
  className,
}: {
  code: CountryCode
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        `fi fi-${code.toLowerCase()} shrink-0 rounded-[2px]`,
        className
      )}
    />
  )
}

/** Lowercase without diacritics, so "egypte" matches "Égypte". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function matchesCountry(country: Country, query: string) {
  const search = normalize(query.trim())
  return (
    normalize(country.name).includes(search) ||
    country.code.toLowerCase() === search
  )
}

type CountryPickerProps = {
  /** Form field name; the submitted value is the ISO code (e.g. "CM"). */
  name: string
  id?: string
  defaultValue?: CountryCode
  className?: string
}

/** Searchable list of every country, with flags and localized names. */
export function CountryPicker({
  name,
  id,
  defaultValue,
  className,
}: CountryPickerProps) {
  const t = useTranslations("CountryPicker")
  const locale = useLocale()
  const countries = useMemo(() => getCountries(locale), [locale])
  const [value, setValue] = useState<Country | null>(
    () => countries.find((country) => country.code === defaultValue) ?? null
  )

  return (
    <Combobox
      items={countries}
      value={value}
      onValueChange={setValue}
      name={name}
      itemToStringLabel={(country: Country) => country.name}
      itemToStringValue={(country: Country) => country.code}
      isItemEqualToValue={(item: Country, selected: Country) =>
        item.code === selected.code
      }
      filter={matchesCountry}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder={t("placeholder")}
        showClear={value !== null}
        className={className}
      >
        {value && (
          <InputGroupAddon align="inline-start">
            <Flag code={value.code} />
          </InputGroupAddon>
        )}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>{t("empty")}</ComboboxEmpty>
        <ComboboxList>
          {(country: Country) => (
            <ComboboxItem key={country.code} value={country}>
              <Flag code={country.code} />
              {country.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
