package com.mosque.crm.enums;

public enum SacrificeAnimalSize {
    SMALL(1),
    LARGE(7);

    private final int maxShares;

    SacrificeAnimalSize(int maxShares) {
        this.maxShares = maxShares;
    }

    public int getMaxShares() {
        return maxShares;
    }
}
