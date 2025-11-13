"""
Type system for LowLogic language
Handles type checking, compatibility, and size calculations
"""

from typing import Dict, List, Optional, Union, Any
from enum import Enum
from dataclasses import dataclass


class PrimitiveType(Enum):
    INT = "int"
    FLOAT = "float"
    CHAR = "char"
    BOOL = "bool"
    STRING = "string"
    VOID = "void"


@dataclass
class TypeInfo:
    """Information about a type"""
    name: str
    size: int
    is_primitive: bool = True
    is_pointer: bool = False
    element_type: Optional['TypeInfo'] = None  # For arrays and pointers
    is_array: bool = False
    array_size: Optional[int] = None
    members: Dict[str, 'TypeInfo'] = None  # For structs/classes

    def __post_init__(self):
        if self.members is None:
            self.members = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "size": self.size,
            "is_primitive": self.is_primitive,
            "is_pointer": self.is_pointer,
            "element_type": self.element_type.to_dict() if self.element_type else None,
            "is_array": self.is_array,
            "array_size": self.array_size,
            "members": {name: member.to_dict() for name, member in self.members.items()}
        }


class TypeSystem:
    """Manages type information and operations"""

    def __init__(self):
        self.types: Dict[str, TypeInfo] = {}
        self.struct_types: Dict[str, TypeInfo] = {}
        self.class_types: Dict[str, TypeInfo] = {}

        # Initialize primitive types
        self._initialize_primitive_types()

    def _initialize_primitive_types(self):
        """Initialize built-in primitive types"""
        self.types["int"] = TypeInfo("int", 4, True)
        self.types["float"] = TypeInfo("float", 4, True)
        self.types["char"] = TypeInfo("char", 1, True)
        self.types["bool"] = TypeInfo("bool", 1, True)
        self.types["string"] = TypeInfo("string", 8, True)  # Pointer to string data
        self.types["void"] = TypeInfo("void", 0, True)

    def get_type(self, type_name: str) -> Optional[TypeInfo]:
        """Get type information by name"""
        return self.types.get(type_name) or \
               self.struct_types.get(type_name) or \
               self.class_types.get(type_name)

    def create_pointer_type(self, base_type_name: str) -> TypeInfo:
        """Create a pointer type"""
        base_type = self.get_type(base_type_name)
        if not base_type:
            raise ValueError(f"Unknown base type: {base_type_name}")

        pointer_name = f"ptr<{base_type_name}>"
        if pointer_name not in self.types:
            self.types[pointer_name] = TypeInfo(
                name=pointer_name,
                size=8,  # 64-bit pointers
                is_primitive=False,
                is_pointer=True,
                element_type=base_type
            )

        return self.types[pointer_name]

    def create_array_type(self, element_type_name: str, size: Optional[int] = None) -> TypeInfo:
        """Create an array type"""
        element_type = self.get_type(element_type_name)
        if not element_type:
            raise ValueError(f"Unknown element type: {element_type_name}")

        if size is not None:
            array_name = f"{element_type_name}[{size}]"
            array_size = element_type.size * size
        else:
            array_name = f"{element_type_name}[]"
            array_size = 8  # Pointer to dynamic array

        if array_name not in self.types:
            self.types[array_name] = TypeInfo(
                name=array_name,
                size=array_size,
                is_primitive=False,
                is_array=True,
                array_size=size,
                element_type=element_type
            )

        return self.types[array_name]

    def create_struct_type(self, name: str, members: Dict[str, str]) -> TypeInfo:
        """Create a struct type"""
        # Calculate total size and member offsets
        member_types = {}
        offset = 0
        for member_name, member_type_name in members.items():
            member_type = self.get_type(member_type_name)
            if not member_type:
                raise ValueError(f"Unknown member type: {member_type_name}")

            member_types[member_name] = member_type
            offset += member_type.size

        struct_type = TypeInfo(
            name=name,
            size=offset,
            is_primitive=False,
            members=member_types
        )

        self.struct_types[name] = struct_type
        return struct_type

    def create_class_type(self, name: str, members: Dict[str, str]) -> TypeInfo:
        """Create a class type"""
        # For now, classes are similar to structs
        return self.create_struct_type(name, members)

    def is_compatible(self, type1: str, type2: str, strict: bool = False) -> bool:
        """Check if two types are compatible for assignment/operations"""
        if type1 == type2:
            return True

        info1 = self.get_type(type1)
        info2 = self.get_type(type2)

        if not info1 or not info2:
            return False

        # Allow implicit conversion between int and float
        if not strict:
            if (type1 in ["int", "float"] and type2 in ["int", "float"]):
                return True

            # Allow bool to int conversion
            if type1 == "bool" and type2 == "int":
                return True

        # Pointer compatibility
        if info1.is_pointer and info2.is_pointer:
            # Allow null pointer assignment to any pointer type
            if type2 == "ptr<void>" or type1 == "ptr<void>":
                return True
            # Allow pointer to void assignment from any pointer
            if type2 == "ptr<void>" or type1 == "ptr<void>":
                return True

        return False

    def can_convert(self, from_type: str, to_type: str) -> bool:
        """Check if implicit conversion is possible"""
        return self.is_compatible(from_type, to_type, strict=False)

    def convert_value(self, value: Any, from_type: str, to_type: str) -> Any:
        """Convert a value from one type to another"""
        if from_type == to_type:
            return value

        # Numeric conversions
        if from_type == "int" and to_type == "float":
            return float(value)
        elif from_type == "float" and to_type == "int":
            return int(value)
        elif from_type == "bool" and to_type == "int":
            return 1 if value else 0
        elif from_type == "int" and to_type == "bool":
            return value != 0

        # Character conversions
        elif from_type == "char" and to_type == "int":
            return ord(value)
        elif from_type == "int" and to_type == "char":
            return chr(value % 256)

        # String conversions
        elif from_type in ["int", "float", "bool"] and to_type == "string":
            return str(value)
        elif from_type == "char" and to_type == "string":
            return value

        raise ValueError(f"Cannot convert {from_type} to {to_type}")

    def get_type_size(self, type_name: str) -> int:
        """Get size of a type in bytes"""
        type_info = self.get_type(type_name)
        if not type_info:
            raise ValueError(f"Unknown type: {type_name}")
        return type_info.size

    def is_numeric_type(self, type_name: str) -> bool:
        """Check if type is numeric"""
        return type_name in ["int", "float", "char", "bool"]

    def is_pointer_type(self, type_name: str) -> bool:
        """Check if type is a pointer type"""
        type_info = self.get_type(type_name)
        return type_info.is_pointer if type_info else False

    def get_base_type(self, type_name: str) -> Optional[str]:
        """Get base type for pointers and arrays"""
        type_info = self.get_type(type_name)
        if type_info and type_info.element_type:
            return type_info.element_type.name
        return None

    def get_member_offset(self, type_name: str, member_name: str) -> Optional[int]:
        """Get offset of a member in a struct/class"""
        type_info = self.get_type(type_name)
        if not type_info or not type_info.members:
            return None

        offset = 0
        for name, member_type in type_info.members.items():
            if name == member_name:
                return offset
            offset += member_type.size

        return None

    def get_member_type(self, type_name: str, member_name: str) -> Optional[str]:
        """Get type of a member in a struct/class"""
        type_info = self.get_type(type_name)
        if not type_info or not type_info.members:
            return None

        if member_name in type_info.members:
            return type_info.members[member_name].name

        return None

    def validate_operation(self, op: str, left_type: str, right_type: Optional[str] = None) -> Optional[str]:
        """Validate a binary operation and return result type"""
        # Assignment operations
        if op in ["=", "+=", "-=", "*=", "/="]:
            if not right_type:
                return None
            if self.is_compatible(right_type, left_type):
                return left_type
            return None

        # Arithmetic operations
        if op in ["+", "-", "*", "/", "%"]:
            if not right_type:
                return None
            if self.is_numeric_type(left_type) and self.is_numeric_type(right_type):
                # Return float if either operand is float
                return "float" if left_type == "float" or right_type == "float" else "int"
            return None

        # Comparison operations
        if op in ["==", "!=", "<", "<=", ">", ">="]:
            if not right_type:
                return None
            if self.is_compatible(left_type, right_type):
                return "bool"
            return None

        # Logical operations
        if op in ["&&", "||"]:
            if not right_type:
                return None
            if left_type == "bool" and right_type == "bool":
                return "bool"
            return None

        # Unary operations
        if op in ["!", "-"]:
            if op == "!" and left_type == "bool":
                return "bool"
            elif op == "-" and self.is_numeric_type(left_type):
                return left_type
            return None

        # Pointer operations
        if op in ["&", "*"]:
            if op == "&":  # Address of
                return f"ptr<{left_type}>"
            elif op == "*":  # Dereference
                if self.is_pointer_type(left_type):
                    return self.get_base_type(left_type)
            return None

        return None

    def get_all_types(self) -> Dict[str, TypeInfo]:
        """Get all registered types"""
        all_types = {}
        all_types.update(self.types)
        all_types.update(self.struct_types)
        all_types.update(self.class_types)
        return all_types