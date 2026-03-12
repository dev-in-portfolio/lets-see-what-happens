package com.example.codex.core.model

enum class MasterCategoryKey(
    val index: Int,
    val title: String,
) {
    E1(1, "Staples and Starches"),
    E2(2, "Vegetables"),
    E3(3, "Fruits"),
    E4(4, "Legumes and Pulses"),
    E5(5, "Nuts and Seeds"),
    E6(6, "Proteins"),
    E7(7, "Herbs and Leafy Aromatics"),
    E8(8, "Spices and Dried Aromatics"),
    E9(9, "Base Aromatics"),
    E10(10, "Fats and Cooking Mediums"),
    E11(11, "Dairy and Dairy-Like Ingredients"),
    E12(12, "Acids and Souring Agents"),
    E13(13, "Condiments, Sauces, and Pastes"),
    E14(14, "Fermented, Pickled, Cured, and Preserved Ingredients"),
    E15(15, "Sweeteners"),
    E16(16, "Liquids and Cooking Liquids"),
    E17(17, "Garnishes and Finishing Elements"),
    E18(18, "Specialty / Wildcard Ingredients"),
    E19(19, "Traditional Remedies and Holistic Medicinal Ingredients"),
    E20(20, "Beverages, Spirits, and Fermentation Bases"),
    E21(21, "Salts, Mineral Seasonings, and Alkaline Agents"),
    E22(22, "Leaveners, Cultures, Coagulants, Thickeners, Gelling Agents, and Functional Agents"),
    E23(23, "Wrappers, Casings, and Food-Contact Preparation Media"),
    E24(24, "Smoke, Woods, Ashes, and Infusion / Exposure Media"),
}

data class MasterCategoryDefinition(
    val key: MasterCategoryKey,
    val codexSuffix: String,
    val index: Int,
    val displayName: String,
)

object MasterCategoryCatalog {
    val categories: List<MasterCategoryDefinition> = MasterCategoryKey.entries.map { key ->
        MasterCategoryDefinition(
            key = key,
            codexSuffix = key.index.toString(),
            index = key.index,
            displayName = key.title,
        )
    }

    fun categoryCodexId(buildUnitCodexId: String, key: MasterCategoryKey): String = "$buildUnitCodexId.${key.index}"
}
